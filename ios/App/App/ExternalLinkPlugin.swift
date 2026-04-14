import Foundation
import Capacitor
import StoreKit

@objc(ExternalLinkPlugin)
public class ExternalLinkPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ExternalLinkPlugin"
    public let jsName = "ExternalLink"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canOpen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    /// Check whether the External Link Account entitlement is available.
    @objc func canOpen(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            Task {
                let canOpen = await ExternalLinkAccount.canOpen
                call.resolve(["canOpen": canOpen])
            }
        } else {
            // Fallback for iOS < 16 — entitlement not available
            call.resolve(["canOpen": false])
        }
    }

    /// Present the Apple-mandated disclosure sheet and open the external link.
    /// If the entitlement isn't approved yet or the user cancels, falls back
    /// to opening the URL directly in Safari.
    @objc func open(_ call: CAPPluginCall) {
        let fallbackURL = call.getString("url") ?? "https://www.hymnz.com/subscribe"

        if #available(iOS 16.0, *) {
            Task {
                let canOpen = await ExternalLinkAccount.canOpen
                if canOpen {
                    do {
                        try await ExternalLinkAccount.open()
                        call.resolve(["opened": true, "method": "entitlement"])
                    } catch {
                        // User cancelled the disclosure sheet or an error occurred.
                        // Fall back to opening in Safari.
                        await openInSafari(url: fallbackURL)
                        call.resolve(["opened": true, "method": "safari_fallback"])
                    }
                } else {
                    // Entitlement not yet approved — open directly in Safari
                    await openInSafari(url: fallbackURL)
                    call.resolve(["opened": true, "method": "safari_fallback"])
                }
            }
        } else {
            // iOS < 16 — open directly in Safari
            Task {
                await openInSafari(url: fallbackURL)
                call.resolve(["opened": true, "method": "safari_fallback"])
            }
        }
    }

    @MainActor
    private func openInSafari(url: String) {
        guard let url = URL(string: url) else { return }
        UIApplication.shared.open(url)
    }
}
