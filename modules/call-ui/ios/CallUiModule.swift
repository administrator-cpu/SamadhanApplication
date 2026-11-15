import ExpoModulesCore

public class CallUiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CallUi")

    Events("onAction", "onVoipToken", "onAudioSession")

    OnCreate {
      CallManager.shared.attach { [weak self] name, body in
        self?.sendEvent(name, body)
      }
      CallManager.shared.start()
    }

    OnDestroy {
      CallManager.shared.detach()
    }

    OnStartObserving {
      CallManager.shared.setObserving(true)
    }

    OnStopObserving {
      CallManager.shared.setObserving(false)
    }

    Function("getVoipToken") { () -> String? in
      CallManager.shared.voipToken
    }

    Function("setConfig") { (deviceId: String?, declineUrl: String?) in
      CallManager.shared.setConfig(deviceId: deviceId, declineUrl: declineUrl)
    }

    Function("showIncomingCall") { (callId: String, callerName: String, subtitle: String?, declineUrl: String?, declineToken: String?, timeoutMs: Double) in
      if let declineUrl { CallManager.shared.setConfig(deviceId: nil, declineUrl: declineUrl) }
      CallManager.shared.showIncoming(callId: callId, callerName: callerName, declineToken: declineToken, timeoutMs: timeoutMs)
    }

    Function("dismissIncomingCall") { (callId: String) in
      CallManager.shared.dismissIncoming(callId: callId)
    }

    Function("dismissAllIncomingCalls") {
      CallManager.shared.dismissAll()
    }

    Function("endCall") { (callId: String) in
      CallManager.shared.endCall(callId: callId)
    }

    Function("setMuted") { (callId: String, muted: Bool) in
      CallManager.shared.setMuted(callId: callId, muted: muted)
    }

    Function("setActiveCall") { (callId: String?) in
      CallManager.shared.setActiveCall(callId)
    }

    Function("consumePendingActions") { () -> [[String: Any]] in
      CallManager.shared.consumePendingActions()
    }

    Function("isAudioSessionActive") { () -> Bool in
      CallManager.shared.isAudioSessionActive
    }
  }
}
