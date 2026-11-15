import ExpoModulesCore
import UIKit

/// Registers for VoIP pushes at launch, including a launch caused by a VoIP push while the app was killed.
public class CallUiAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    CallManager.shared.start()
    return true
  }
}
