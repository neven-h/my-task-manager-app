import Foundation
import LocalAuthentication
import Capacitor

@objc(BiometricsPlugin)
public class BiometricsPlugin: CAPPlugin {

    @objc
    public func checkAvailability(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        let biometryType = Self.string(from: context.biometryType)
        var errorMessage: String? = nil
        if !canEvaluate, let err = error {
            errorMessage = err.localizedDescription
        }
        call.resolve([
            "available": canEvaluate,
            "biometryType": biometryType,
            "error": errorMessage as Any
        ])
    }

    @objc
    public func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Authenticate to continue"
        let context = LAContext()

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) {
            evaluateBiometrics(context: context, reason: reason, call: call)
        } else if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) {
            evaluateDeviceOwnerAuthentication(context: context, reason: reason, call: call)
        } else {
            call.reject("Biometric authentication is not available on this device.")
        }
    }

    private func evaluateBiometrics(context: LAContext, reason: String, call: CAPPluginCall) {
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve([
                        "success": true,
                        "biometryType": Self.string(from: context.biometryType)
                    ])
                } else {
                    if let error = error {
                        call.reject(error.localizedDescription)
                    } else {
                        call.reject("Authentication failed.")
                    }
                }
            }
        }
    }

    private func evaluateDeviceOwnerAuthentication(context: LAContext, reason: String, call: CAPPluginCall) {
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve([
                        "success": true,
                        "biometryType": Self.string(from: context.biometryType)
                    ])
                } else {
                    if let error = error {
                        call.reject(error.localizedDescription)
                    } else {
                        call.reject("Authentication failed.")
                    }
                }
            }
        }
    }

    private static func string(from biometryType: LABiometryType) -> String {
        switch biometryType {
        case .faceID: return "faceID"
        case .touchID: return "touchID"
        default: return "none"
        }
    }
}
