import UIKit
import WebKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        #if targetEnvironment(simulator)
        // Simulator cannot trust the self-signed api.drpitz.club cert.
        // 127.0.0.1 is the Mac (IPv4) where Flask listens on :5001.
        let source = "window.__DPC_API_BASE='http://127.0.0.1:5001/api';"
        config.userContentController.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        #endif
        return config
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CalendarPlugin())
        bridge?.registerPluginInstance(BiometricAuthPlugin())
    }
}
