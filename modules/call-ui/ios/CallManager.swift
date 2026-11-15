import AVFoundation
import CallKit
import Foundation
import PushKit
import UIKit

/// PushKit VoIP + CallKit. Lives for the whole process and starts at launch (see CallUiAppDelegateSubscriber),
/// because iOS delivers the VoIP push before JS is running and terminates apps that do not report it to CallKit.
final class CallManager: NSObject {
  static let shared = CallManager()

  static let declineUrlKey = "SamadhanCallDeclineUrl"
  private static let deviceIdDefaultsKey = "samadhan.callui.deviceId"
  private static let declineUrlDefaultsKey = "samadhan.callui.declineUrl"
  private static let defaultTimeoutMs: Double = 45_000

  private struct Call {
    let uuid: UUID
    let callId: String
    var answered = false
    var muted = false
    var declineToken: String?
    var timeout: DispatchWorkItem?
  }

  private let provider: CXProvider
  private let controller = CXCallController()
  private var registry: PKPushRegistry?

  // Main-thread state.
  private var calls: [String: Call] = [:]
  private var recentlyEnded: [String: Date] = [:]
  private var activeJsCallId: String?

  // Read from the JS thread: guarded by `lock`.
  private let lock = NSLock()
  private var _voipToken: String?
  private var _audioActive = false
  private var _pending: [[String: Any]] = []
  private var _observing = false
  private var emitter: ((String, [String: Any]) -> Void)?

  private override init() {
    let config = CXProviderConfiguration()
    config.supportsVideo = false
    config.maximumCallGroups = 1
    config.maximumCallsPerCallGroup = 1
    config.supportedHandleTypes = [.generic]
    config.includesCallsInRecents = false
    if let icon = UIImage(named: "CallKitIcon") {
      config.iconTemplateImageData = icon.pngData()
    }
    provider = CXProvider(configuration: config)
    super.init()
    provider.setDelegate(self, queue: nil)
  }

  // MARK: - Lifecycle

  func start() {
    onMain {
      guard self.registry == nil else { return }
      let registry = PKPushRegistry(queue: .main)
      registry.delegate = self
      registry.desiredPushTypes = [.voIP]
      self.registry = registry
    }
  }

  func attach(_ emit: @escaping (String, [String: Any]) -> Void) {
    locked { emitter = emit }
  }

  func detach() {
    locked {
      emitter = nil
      _observing = false
    }
  }

  func setObserving(_ value: Bool) {
    locked { _observing = value }
  }

  var voipToken: String? { locked { _voipToken } }
  var isAudioSessionActive: Bool { locked { _audioActive } }

  func consumePendingActions() -> [[String: Any]] {
    locked {
      let out = _pending
      _pending.removeAll()
      return out
    }
  }

  func setConfig(deviceId: String?, declineUrl: String?) {
    let defaults = UserDefaults.standard
    if let deviceId, !deviceId.isEmpty { defaults.set(deviceId, forKey: Self.deviceIdDefaultsKey) }
    if let declineUrl, !declineUrl.isEmpty { defaults.set(declineUrl, forKey: Self.declineUrlDefaultsKey) }
  }

  // MARK: - JS-facing call control

  func showIncoming(callId: String, callerName: String, declineToken: String?, timeoutMs: Double) {
    onMain {
      self.reportIncoming(callId: callId, callerName: callerName, declineToken: declineToken, timeoutMs: timeoutMs, fromPush: false) {}
    }
  }

  /// Stops ringing (the in-app screen took over, or the call went away). Never touches an answered call.
  func dismissIncoming(callId: String) {
    onMain {
      guard let call = self.calls[callId], !call.answered else { return }
      self.endLocally(callId, reason: .remoteEnded)
    }
  }

  func dismissAll() {
    onMain {
      for (id, call) in self.calls where !call.answered { self.endLocally(id, reason: .remoteEnded) }
    }
  }

  /// Ends the native call in any state (the app's call ended).
  func endCall(callId: String) {
    onMain {
      guard self.calls[callId] != nil else { return }
      self.endLocally(callId, reason: .remoteEnded)
    }
  }

  func setMuted(callId: String, muted: Bool) {
    onMain {
      guard let call = self.calls[callId], call.answered, call.muted != muted else { return }
      self.calls[callId]?.muted = muted
      self.controller.request(CXTransaction(action: CXSetMutedCallAction(call: call.uuid, muted: muted))) { _ in }
    }
  }

  /// The app's own call state; a new invite while busy is reported and ended at once (busy).
  func setActiveCall(_ callId: String?) {
    onMain { self.activeJsCallId = (callId?.isEmpty ?? true) ? nil : callId }
  }

  // MARK: - Reporting

  private func baseUpdate(_ callerName: String) -> CXCallUpdate {
    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: callerName)
    update.localizedCallerName = callerName
    update.hasVideo = false
    update.supportsHolding = false
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsDTMF = false
    return update
  }

  private func isBusy(except callId: String) -> Bool {
    if let active = activeJsCallId, active != callId { return true }
    return calls.values.contains { $0.answered && $0.callId != callId }
  }

  private func reportIncoming(callId: String, callerName: String, declineToken: String?, timeoutMs: Double, fromPush: Bool, completion: @escaping () -> Void) {
    if let existing = calls[callId] {
      if let declineToken, existing.declineToken == nil { calls[callId]?.declineToken = declineToken }
      guard fromPush else { return completion() }
      // Same call already on screen: re-reporting its UUID satisfies PushKit (CallKit answers callUUIDAlreadyExists).
      provider.reportNewIncomingCall(with: existing.uuid, update: baseUpdate(callerName)) { _ in completion() }
      return
    }

    if wasRecentlyEnded(callId) || isBusy(except: callId) {
      guard fromPush else { return completion() }
      return reportAndEnd(completion)
    }

    let uuid = UUID()
    calls[callId] = Call(uuid: uuid, callId: callId, declineToken: declineToken)

    provider.reportNewIncomingCall(with: uuid, update: baseUpdate(callerName)) { error in
      guard error == nil else {
        if self.calls[callId]?.uuid == uuid { self.calls[callId] = nil }
        completion()
        return
      }
      let timeout = DispatchWorkItem { [weak self] in
        guard let self, let call = self.calls[callId], call.uuid == uuid, !call.answered else { return }
        self.endLocally(callId, reason: .unanswered)
      }
      self.calls[callId]?.timeout = timeout
      let ms = max(5_000, min(timeoutMs > 0 ? timeoutMs : Self.defaultTimeoutMs, 120_000))
      DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(Int(ms)), execute: timeout)
      // Lets JS connect the socket early so the buffered invite/offer are ready when the user answers.
      self.emit(["action": "show", "callId": callId], queueIfNoListener: false)
      completion()
    }
  }

  /// Every VoIP push must produce a CallKit report. For pushes that should not ring, report and end immediately.
  private func reportAndEnd(_ completion: @escaping () -> Void) {
    let uuid = UUID()
    provider.reportNewIncomingCall(with: uuid, update: baseUpdate("Call ended")) { _ in
      self.provider.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
      completion()
    }
  }

  private func handleCancel(callId: String, reason: String?, completion: @escaping () -> Void) {
    guard let call = calls[callId] else { return reportAndEnd(completion) }
    provider.reportNewIncomingCall(with: call.uuid, update: baseUpdate("Call ended")) { _ in
      if let current = self.calls[callId], !current.answered {
        self.endLocally(callId, reason: Self.endReason(reason))
      }
      completion()
    }
  }

  private static func endReason(_ reason: String?) -> CXCallEndedReason {
    switch reason {
    case "answered_elsewhere": return .answeredElsewhere
    case "declined_elsewhere": return .declinedElsewhere
    default: return .remoteEnded
    }
  }

  private func endLocally(_ callId: String, reason: CXCallEndedReason) {
    guard let call = calls.removeValue(forKey: callId) else { return }
    call.timeout?.cancel()
    markEnded(callId)
    provider.reportCall(with: call.uuid, endedAt: Date(), reason: reason)
  }

  private func markEnded(_ callId: String) {
    let now = Date()
    recentlyEnded = recentlyEnded.filter { now.timeIntervalSince($0.value) < 120 }
    recentlyEnded[callId] = now
  }

  private func wasRecentlyEnded(_ callId: String) -> Bool {
    guard let at = recentlyEnded[callId] else { return false }
    return Date().timeIntervalSince(at) < 120
  }

  private func find(_ uuid: UUID) -> Call? {
    calls.values.first { $0.uuid == uuid }
  }

  // MARK: - Decline without JS

  private func postDecline(_ call: Call) {
    guard let token = call.declineToken, !token.isEmpty else { return }
    let defaults = UserDefaults.standard
    let urlString = defaults.string(forKey: Self.declineUrlDefaultsKey)
      ?? Bundle.main.object(forInfoDictionaryKey: Self.declineUrlKey) as? String
    guard let urlString, let url = URL(string: urlString) else { return }

    var body: [String: Any] = ["callId": call.callId, "token": token]
    if let deviceId = defaults.string(forKey: Self.deviceIdDefaultsKey) { body["deviceId"] = deviceId }

    var request = URLRequest(url: url, timeoutInterval: 10)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    var task: UIBackgroundTaskIdentifier = .invalid
    task = UIApplication.shared.beginBackgroundTask(withName: "samadhan-call-decline") {
      UIApplication.shared.endBackgroundTask(task)
      task = .invalid
    }
    URLSession.shared.dataTask(with: request) { _, _, _ in
      DispatchQueue.main.async {
        if task != .invalid { UIApplication.shared.endBackgroundTask(task) }
        task = .invalid
      }
    }.resume()
  }

  private func configureAudioSession() {
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP])
  }

  // MARK: - Events

  /// Answer/decline/end are queued while JS is not listening (cold start from the lock screen) and drained at mount.
  private func emit(_ body: [String: Any], queueIfNoListener: Bool) {
    let send: ((String, [String: Any]) -> Void)? = locked {
      if _observing, let emitter { return emitter }
      if queueIfNoListener {
        _pending.removeAll { ($0["callId"] as? String) == (body["callId"] as? String) && ($0["action"] as? String) == (body["action"] as? String) }
        _pending.append(body.merging(["at": Date().timeIntervalSince1970 * 1000]) { a, _ in a })
      }
      return nil
    }
    send?("onAction", body)
  }

  private func emitRaw(_ name: String, _ body: [String: Any]) {
    let send = locked { emitter }
    send?(name, body)
  }

  // MARK: - Helpers

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread { work() } else { DispatchQueue.main.async(execute: work) }
  }

  @discardableResult
  private func locked<T>(_ work: () -> T) -> T {
    lock.lock()
    defer { lock.unlock() }
    return work()
  }
}

// MARK: - PushKit

extension CallManager: PKPushRegistryDelegate {
  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    guard type == .voIP else { return }
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    locked { _voipToken = token }
    emitRaw("onVoipToken", ["token": token])
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    guard type == .voIP else { return }
    locked { _voipToken = nil }
    emitRaw("onVoipToken", ["token": ""])
  }

  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    guard type == .voIP else { return completion() }
    let data = payload.dictionaryPayload
    let kind = data["type"] as? String ?? ""
    let callId = (data["callId"] as? String) ?? ""
    let expiresAt: Double? = (data["expiresAt"] as? String).flatMap(Double.init) ?? (data["expiresAt"] as? NSNumber)?.doubleValue
    let nowMs = Date().timeIntervalSince1970 * 1000

    switch kind {
    case "call_invite" where !callId.isEmpty:
      if let expiresAt, nowMs >= expiresAt { return reportAndEnd(completion) }
      let callerName = (data["callerName"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Incoming call"
      reportIncoming(
        callId: callId,
        callerName: callerName,
        declineToken: data["declineToken"] as? String,
        timeoutMs: expiresAt.map { $0 - nowMs } ?? Self.defaultTimeoutMs,
        fromPush: true,
        completion: completion
      )
    case "call_cancel" where !callId.isEmpty:
      handleCancel(callId: callId, reason: data["reason"] as? String, completion: completion)
    default:
      reportAndEnd(completion)
    }
  }
}

// MARK: - CallKit

extension CallManager: CXProviderDelegate {
  func providerDidReset(_ provider: CXProvider) {
    for call in calls.values {
      call.timeout?.cancel()
      if call.answered { emit(["action": "end", "callId": call.callId], queueIfNoListener: false) }
    }
    calls.removeAll()
    locked { _audioActive = false }
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    guard let call = find(action.callUUID) else { return action.fail() }
    call.timeout?.cancel()
    calls[call.callId]?.answered = true
    calls[call.callId]?.timeout = nil
    configureAudioSession()
    action.fulfill()
    emit(["action": "answer", "callId": call.callId], queueIfNoListener: true)
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    guard let call = find(action.callUUID) else { return action.fulfill() }
    call.timeout?.cancel()
    calls[call.callId] = nil
    markEnded(call.callId)
    if call.answered {
      emit(["action": "end", "callId": call.callId], queueIfNoListener: true)
    } else {
      postDecline(call)
      emit(["action": "decline", "callId": call.callId], queueIfNoListener: true)
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    guard let call = find(action.callUUID) else { return action.fail() }
    calls[call.callId]?.muted = action.isMuted
    emit(["action": "mute", "callId": call.callId, "muted": action.isMuted], queueIfNoListener: false)
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
    action.fail()
  }

  func provider(_ provider: CXProvider, timedOutPerforming action: CXAction) {
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    locked { _audioActive = true }
    emitRaw("onAudioSession", ["active": true])
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    locked { _audioActive = false }
    emitRaw("onAudioSession", ["active": false])
  }
}
