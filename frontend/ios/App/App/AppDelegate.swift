import UIKit
import Capacitor
import LocalAuthentication

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    private var lockView: UIView?
    private var isLocked: Bool = true

    @objc private func didTapUnlock() {
        authenticateUser()
    }

    private func showLockOverlay(message: String? = nil) {
        guard let window = window else { return }
        if lockView == nil {
            let overlay = UIView(frame: window.bounds)
            overlay.backgroundColor = UIColor.systemBackground
            overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]

            let stack = UIStackView()
            stack.axis = .vertical
            stack.alignment = .center
            stack.spacing = 16
            stack.translatesAutoresizingMaskIntoConstraints = false

            let icon = UIImageView()
            if let faceImage = UIImage(systemName: "faceid") ?? UIImage(systemName: "lock.fill") {
                icon.image = faceImage
                icon.tintColor = .label
            }
            icon.contentMode = .scaleAspectFit
            icon.heightAnchor.constraint(equalToConstant: 44).isActive = true
            icon.widthAnchor.constraint(equalToConstant: 44).isActive = true

            let title = UILabel()
            title.text = "Unlock with Face ID"
            title.font = UIFont.preferredFont(forTextStyle: .headline)
            title.textColor = .label

            let subtitle = UILabel()
            subtitle.text = message ?? "Use Face ID (or your passcode) to unlock."
            subtitle.font = UIFont.preferredFont(forTextStyle: .subheadline)
            subtitle.textColor = .secondaryLabel
            subtitle.numberOfLines = 0
            subtitle.textAlignment = .center

            let button = UIButton(type: .system)
            button.setTitle("Unlock", for: .normal)
            button.addTarget(self, action: #selector(didTapUnlock), for: .touchUpInside)

            stack.addArrangedSubview(icon)
            stack.addArrangedSubview(title)
            stack.addArrangedSubview(subtitle)
            stack.addArrangedSubview(button)

            overlay.addSubview(stack)

            NSLayoutConstraint.activate([
                stack.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
                stack.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
                stack.leadingAnchor.constraint(greaterThanOrEqualTo: overlay.leadingAnchor, constant: 24),
                stack.trailingAnchor.constraint(lessThanOrEqualTo: overlay.trailingAnchor, constant: -24)
            ])

            window.addSubview(overlay)
            lockView = overlay
        } else {
            if let stack = lockView?.subviews.first(where: { $0 is UIStackView }) as? UIStackView,
               stack.arrangedSubviews.count >= 3,
               let label = stack.arrangedSubviews[2] as? UILabel {
                label.text = message ?? "Use Face ID (or your passcode) to unlock."
            }
        }
    }

    private func removeLockOverlay() {
        lockView?.removeFromSuperview()
        lockView = nil
    }

    private func authenticateUser() {
        let context = LAContext()
        context.localizedFallbackTitle = "Use Passcode"
        var error: NSError?

        let policy: LAPolicy = .deviceOwnerAuthentication

        guard context.canEvaluatePolicy(policy, error: &error) else {
            // Device/passcode auth not available; don't block the app
            self.isLocked = false
            self.removeLockOverlay()
            return
        }

        let reason = "Unlock to access your data"
        context.evaluatePolicy(policy, localizedReason: reason) { success, evalError in
            DispatchQueue.main.async {
                if success {
                    self.isLocked = false
                    self.removeLockOverlay()
                } else {
                    self.isLocked = true
                    let message: String
                    if let laError = evalError as? LAError {
                        switch laError.code {
                        case .biometryNotEnrolled:
                            message = "Biometrics not set up. Use your passcode to unlock."
                        case .biometryLockout:
                            message = "Biometrics locked. Use your passcode to unlock."
                        case .userCancel, .systemCancel:
                            message = "Authentication canceled."
                        default:
                            message = "Authentication failed. Try again."
                        }
                    } else {
                        message = "Authentication failed. Try again."
                    }
                    self.showLockOverlay(message: message)
                }
            }
        }
    }

    private func presentLockIfNeeded() {
        guard isLocked else { return }
        showLockOverlay()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.authenticateUser()
        }
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Mark the app as locked. We'll prompt on next activation.
        isLocked = true
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Prompt for Face ID / Touch ID when app becomes active
        presentLockIfNeeded()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

