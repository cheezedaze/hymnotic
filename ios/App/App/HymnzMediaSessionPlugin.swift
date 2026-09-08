import Capacitor
import Foundation
import MediaPlayer
import UIKit

@objc(HymnzMediaSessionPlugin)
public final class HymnzMediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HymnzMediaSessionPlugin"
    public let jsName = "HymnzMediaSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise)
    ]

    private var artworkTask: URLSessionDataTask?
    private var currentArtworkURL: String?
    private var currentInfo: [String: Any] = [:]
    private var currentTrackID: String?
    private var cachedArtworkURL: String?
    private var cachedArtwork: MPMediaItemArtwork?

    @objc func configure(_ call: CAPPluginCall) {
        let trackID = call.getString("trackId") ?? ""
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? "HYMNZ"
        let artworkURL = call.getString("artworkUrl")
        let duration = call.getDouble("duration") ?? 0
        let elapsedTime = call.getDouble("elapsedTime") ?? 0
        let isPlaying = call.getBool("isPlaying") ?? false
        let queueCount = call.getInt("queueCount") ?? 1
        let queueIndex = call.getInt("queueIndex") ?? 0

        DispatchQueue.main.async { [weak self] in
            self?.publishNowPlayingInfo(
                trackID: trackID,
                title: title,
                artist: artist,
                artworkURL: artworkURL,
                duration: duration,
                elapsedTime: elapsedTime,
                isPlaying: isPlaying,
                queueCount: queueCount,
                queueIndex: queueIndex
            )
            call.resolve()
        }
    }

    private func installRemoteCommands() {
        let commands = MPRemoteCommandCenter.shared()

        // HYMNZ is a queued music player. Disable every intra-track navigation
        // command so iOS renders previous/next instead of ±10-second buttons.
        commands.skipBackwardCommand.removeTarget(nil)
        commands.skipBackwardCommand.isEnabled = false
        commands.skipForwardCommand.removeTarget(nil)
        commands.skipForwardCommand.isEnabled = false
        commands.seekBackwardCommand.removeTarget(nil)
        commands.seekBackwardCommand.isEnabled = false
        commands.seekForwardCommand.removeTarget(nil)
        commands.seekForwardCommand.isEnabled = false

        commands.togglePlayPauseCommand.removeTarget(nil)
        commands.togglePlayPauseCommand.isEnabled = false

        commands.playCommand.removeTarget(nil)
        commands.playCommand.isEnabled = true
        commands.playCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            return self.sendRemoteCommand("play")
        }

        commands.pauseCommand.removeTarget(nil)
        commands.pauseCommand.isEnabled = true
        commands.pauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            return self.sendRemoteCommand("pause")
        }

        commands.previousTrackCommand.removeTarget(nil)
        commands.previousTrackCommand.isEnabled = true
        commands.previousTrackCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            return self.sendRemoteCommand("previous")
        }

        commands.nextTrackCommand.removeTarget(nil)
        commands.nextTrackCommand.isEnabled = true
        commands.nextTrackCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            return self.sendRemoteCommand("next")
        }
    }

    private func sendRemoteCommand(_ command: String) -> MPRemoteCommandHandlerStatus {
        notifyListeners(
            "remoteCommand",
            data: ["command": command],
            retainUntilConsumed: true
        )
        return .success
    }

    private func publishNowPlayingInfo(
        trackID: String,
        title: String,
        artist: String,
        artworkURL: String?,
        duration: Double,
        elapsedTime: Double,
        isPlaying: Bool,
        queueCount: Int,
        queueIndex: Int
    ) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyAlbumTitle: "HYMNZ",
            MPNowPlayingInfoPropertyExternalContentIdentifier: trackID,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: max(0, elapsedTime),
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: 1.0,
            MPNowPlayingInfoPropertyPlaybackQueueCount: max(1, queueCount),
            MPNowPlayingInfoPropertyPlaybackQueueIndex: max(0, queueIndex),
            MPNowPlayingInfoPropertyIsLiveStream: false
        ]

        if duration.isFinite && duration > 0 {
            info[MPMediaItemPropertyPlaybackDuration] = duration
        }
        if artworkURL == cachedArtworkURL, let cachedArtwork {
            info[MPMediaItemPropertyArtwork] = cachedArtwork
        }

        currentTrackID = trackID
        currentArtworkURL = artworkURL
        currentInfo = info

        let center = MPNowPlayingInfoCenter.default()
        center.nowPlayingInfo = info
        center.playbackState = isPlaying ? .playing : .paused
        installRemoteCommands()

        // WKWebView may finish registering its default seek commands just after
        // playback begins. Re-publish the native session after that transition.
        for delay in [0.25, 1.0] {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let self, self.currentTrackID == trackID else { return }
                MPNowPlayingInfoCenter.default().nowPlayingInfo = self.currentInfo
                self.installRemoteCommands()
            }
        }

        guard let artworkURL, artworkURL != cachedArtworkURL,
              let url = URL(string: artworkURL) else { return }

        artworkTask?.cancel()
        artworkTask = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let data, let image = UIImage(data: data) else { return }
            let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }

            DispatchQueue.main.async {
                guard let self,
                      self.currentTrackID == trackID,
                      self.currentArtworkURL == artworkURL else { return }

                self.cachedArtworkURL = artworkURL
                self.cachedArtwork = artwork
                self.currentInfo[MPMediaItemPropertyArtwork] = artwork
                MPNowPlayingInfoCenter.default().nowPlayingInfo = self.currentInfo
                self.installRemoteCommands()
            }
        }
        artworkTask?.resume()
    }
}
