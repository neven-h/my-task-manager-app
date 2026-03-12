// BiometricAuth Capacitor plugin to store and retrieve credentials protected by Face ID/Touch ID
// This file is self-contained. Add it to the iOS target and ensure it's compiled.

import Foundation
import LocalAuthentication
import Capacitor

@objc(BiometricAuthPlugin)
public class BiometricAuthPlugin: CAPPlugin {
    private let service = "com.example.biometricauth"
    private let accountToken = "authToken"
    private let accountUsername = "authUsername"

    // Enable biometric login by storing credentials in Keychain protected by biometry
    // Call with { token: string, username: string }
    @objc func enable(_ call: CAPPluginCall) {
        let token = call.getString("token") ?? ""
        let username = call.getString("username") ?? ""
        guard !token.isEmpty, !username.isEmpty else {
            call.reject("Missing token or username")
            return
        }
        do {
            try saveKeychain(account: accountToken, data: Data(token.utf8), access: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly)
            try saveKeychain(account: accountUsername, data: Data(username.utf8), access: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly)
            call.resolve(["success": true])
        } catch {
            call.reject("Failed to save credentials: \(error.localizedDescription)")
        }
    }

    // Authenticate with Face ID/Touch ID and return stored credentials
    // Returns { token: string, username: string }
    @objc func authenticate(_ call: CAPPluginCall) {
        let context = LAContext()
        context.localizedFallbackTitle = "Use Passcode"
        var authError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &authError) else {
            call.reject("Biometric/Passcode authentication not available")
            return
        }
        let reason = call.getString("reason") ?? "Authenticate to sign in"
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            if success {
                do {
                    let tokenData = try self.readKeychain(account: self.accountToken)
                    let userData = try self.readKeychain(account: self.accountUsername)
                    let token = String(data: tokenData, encoding: .utf8) ?? ""
                    let username = String(data: userData, encoding: .utf8) ?? ""
                    if token.isEmpty || username.isEmpty {
                        call.reject("No saved credentials")
                    } else {
                        call.resolve(["token": token, "username": username])
                    }
                } catch {
                    call.reject("Failed to read credentials: \(error.localizedDescription)")
                }
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
                    message = "Authentication failed"
                }
                call.reject(message)
            }
        }
    }

    // Remove saved credentials
    @objc func disable(_ call: CAPPluginCall) {
        _ = deleteKeychain(account: accountToken)
        _ = deleteKeychain(account: accountUsername)
        call.resolve(["success": true])
    }
    
    // Check if biometric/passcode auth is available on this device
    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        var result: [String: Any] = ["available": available]
        if let e = error { result["error"] = e.localizedDescription }
        call.resolve(result)
    }

    // MARK: - Keychain helpers
    private func saveKeychain(account: String, data: Data, access: CFString) throws {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            throw error ?? NSError(domain: "BiometricAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "Biometric/Passcode unavailable"])
        }

        let accessControl = SecAccessControlCreateWithFlags(nil, access, .userPresence, nil)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessControl as String: accessControl as Any,
            kSecUseAuthenticationContext as String: context,
            kSecValueData as String: data
        ]
        // Delete existing first
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status), userInfo: nil)
        }
    }

    private func readKeychain(account: String) throws -> Data {
        let context = LAContext()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecUseAuthenticationContext as String: context,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status), userInfo: nil)
        }
        return data
    }

    private func deleteKeychain(account: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
