import Capacitor
import MediaPlayer

@objc(HymnzMediaSessionPlugin)
public final class HymnzMediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HymnzMediaSessionPlugin"
    public let jsName = "HymnzMediaSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise)
    ]

    @objc func configure(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.installTrackCommands()
            call.resolve()
        }
    }

    private func installTrackCommands() {
        let commands = MPRemoteCommandCenter.shared()

        // WebKit exposes seek controls for a bare HTMLAudioElement. HYMNZ is a
        // queued music player, so replace those with explicit track commands.
        commands.skipBackwardCommand.removeTarget(nil)
        commands.skipBackwardCommand.isEnabled = false
        commands.skipForwardCommand.removeTarget(nil)
        commands.skipForwardCommand.isEnabled = false

        commands.previousTrackCommand.removeTarget(nil)
        commands.previousTrackCommand.isEnabled = true
        commands.previousTrackCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            self.notifyListeners(
                "remoteTrackCommand",
                data: ["command": "previous"],
                retainUntilConsumed: true
            )
            return .success
        }

        commands.nextTrackCommand.removeTarget(nil)
        commands.nextTrackCommand.isEnabled = true
        commands.nextTrackCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            self.notifyListeners(
                "remoteTrackCommand",
                data: ["command": "next"],
                retainUntilConsumed: true
            )
            return .success
        }
    }
}
