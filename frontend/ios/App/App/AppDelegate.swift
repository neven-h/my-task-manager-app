import UIKit
import Capacitor
import LocalAuthentication

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        // Ensure Capacitor plugins (including any custom biometric plugin) are registered
        // This is typically automatic, but keeping a reference here avoids tree-shaking in some setups.
        _ = ApplicationDelegateProxy.shared
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
    
    // Convenience: Trigger Face ID/Passcode auth from native side if you need to wire it to a button.
    // Example usage from a view controller: (UIApplication.shared.delegate as? AppDelegate)?.authenticateWithBiometrics(reason: "Sign in with Face ID") { success, error in
    //     // handle result
    // }
    func authenticateWithBiometrics(reason: String = "Authenticate to sign in", completion: @escaping (Bool, String?) -> Void) {
        let context = LAContext()
        var authError: NSError?
        let policy: LAPolicy = .deviceOwnerAuthentication
        guard context.canEvaluatePolicy(policy, error: &authError) else {
            completion(false, authError?.localizedDescription ?? "Biometric/Passcode authentication not available")
            return
        }
        context.localizedFallbackTitle = "Use Passcode"
        context.evaluatePolicy(policy, localizedReason: reason) { success, error in
            if success {
                completion(true, nil)
            } else {
                let message: String
                if let laErr = error as? LAError {
                    switch laErr.code {
                    case .userCancel: message = "Authentication canceled"
                    case .systemCancel: message = "Authentication canceled by system"
                    case .biometryLockout: message = "Biometrics locked. Try passcode."
                    default: message = "Authentication failed"
                    }
                } else {
                    message = error?.localizedDescription ?? "Authentication failed"
                }
                completion(false, message)
            }
        }
    }

}
