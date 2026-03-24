import Foundation
import LocalAuthentication
import Capacitor

@objc(BiometricsPlugin)
public class BiometricsPlugin: CAPPlugin {

    @objc func checkAvailability(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        let typeString = biometryTypeString(context.biometryType)
        var result: [String: Any] = [
            "available": canEvaluate,
            "biometryType": typeString
        ]
        if let error = error {
            result["error"] = error.localizedDescription
        }
        call.resolve(result)
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Authenticate to continue"
        let context = LAContext()
        var authError: NSError?

        // First try biometrics
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, evaluateError in
                DispatchQueue.main.async {
                    if success {
                        let typeString = self.biometryTypeString(context.biometryType)
                        call.resolve(["success": true, "biometryType": typeString])
                    } else {
                        let message = evaluateError?.localizedDescription ?? "Authentication failed"
                        call.reject(message)
                    }
                }
            }
            return
        }

        // Fallback to device passcode if available
        if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &authError) {
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, evaluateError in
                DispatchQueue.main.async {
                    if success {
                        call.resolve(["success": true, "biometryType": "none"]) // authenticated via passcode
                    } else {
                        let message = evaluateError?.localizedDescription ?? "Authentication failed"
                        call.reject(message)
                    }
                }
            }
            return
        }

        let message = authError?.localizedDescription ?? "Biometric authentication is not available on this device"
        call.reject(message)
    }

    private func biometryTypeString(_ type: LABiometryType) -> String {
        switch type {
        case .faceID: return "faceID"
        case .touchID: return "touchID"
        default: return "none"
        }
    }
}
