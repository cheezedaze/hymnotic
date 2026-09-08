import AVFoundation
import Capacitor
import Foundation
import MediaPlayer
import UIKit

private struct HymnzPlaybackTrack: Equatable {
    let id: String
    let title: String
    let artist: String
    let audioURL: URL
    let artworkURL: URL?
    let duration: Double

    init?(_ object: JSObject) {
        guard let id = object["id"] as? String,
              let title = object["title"] as? String,
              let audioURLString = object["audioUrl"] as? String,
              let audioURL = URL(string: audioURLString) else {
            return nil
        }

        self.id = id
        self.title = title
        self.artist = (object["artist"] as? String) ?? "HYMNZ"
        self.audioURL = audioURL
        self.artworkURL = (object["artworkUrl"] as? String).flatMap(URL.init(string:))
        self.duration = (object["duration"] as? NSNumber)?.doubleValue ?? 0
    }
}

@objc(HymnzMediaSessionPlugin)
public final class HymnzMediaSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HymnzMediaSessionPlugin"
    public let jsName = "HymnzMediaSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    private let player = AVPlayer()
    private var tracks: [HymnzPlaybackTrack] = []
    private var queueIndex = 0
    private var repeatMode = "off"
    private var wantsPlayback = false
    private var isConfigured = false
    private var periodicObserver: Any?
    private var itemStatusObservation: NSKeyValueObservation?
    private var playbackObservation: NSKeyValueObservation?
    private var endedObserver: NSObjectProtocol?
    private var interruptionObserver: NSObjectProtocol?
    private var routeObserver: NSObjectProtocol?
    private var artworkTask: URLSessionDataTask?
    private var artworkCache: [URL: MPMediaItemArtwork] = [:]
    private var fallbackArtwork: MPMediaItemArtwork?

    private var currentTrack: HymnzPlaybackTrack? {
        guard tracks.indices.contains(queueIndex) else { return nil }
        return tracks[queueIndex]
    }

    @objc func loadQueue(_ call: CAPPluginCall) {
        let objects = call.getArray("tracks", JSObject.self) ?? []
        let parsedTracks = objects.compactMap(HymnzPlaybackTrack.init)
        guard !parsedTracks.isEmpty else {
            call.reject("Playback queue has no playable tracks", "EMPTY_QUEUE")
            return
        }

        let requestedIndex = min(
            max(0, call.getInt("queueIndex") ?? 0),
            parsedTracks.count - 1
        )
        let position = max(0, call.getDouble("position") ?? 0)
        let shouldPlay = call.getBool("isPlaying") ?? false
        let requestedRepeat = call.getString("repeat") ?? "off"

        syncWebCookies { [weak self] in
            guard let self else {
                call.reject("Native player is unavailable", "PLAYER_UNAVAILABLE")
                return
            }

            self.ensureConfigured()
            let requestedTrack = parsedTracks[requestedIndex]
            let needsNewItem = self.currentTrack?.id != requestedTrack.id ||
                self.currentTrack?.audioURL != requestedTrack.audioURL ||
                self.player.currentItem == nil

            self.tracks = parsedTracks
            self.queueIndex = requestedIndex
            self.repeatMode = ["off", "all", "one"].contains(requestedRepeat)
                ? requestedRepeat
                : "off"
            self.wantsPlayback = shouldPlay
            self.installRemoteCommands()

            if needsNewItem {
                self.loadCurrentTrack(position: position, reason: "loaded")
            } else if shouldPlay {
                self.startPlayback(reason: "play")
            } else {
                self.pausePlayback(reason: "pause")
            }

            call.resolve(self.playbackState(reason: "loaded"))
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.currentTrack != nil else {
                call.reject("No track is loaded", "NO_TRACK")
                return
            }
            self.startPlayback(reason: "play")
            call.resolve(self.playbackState(reason: "play"))
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Native player is unavailable", "PLAYER_UNAVAILABLE")
                return
            }
            self.pausePlayback(reason: "pause")
            call.resolve(self.playbackState(reason: "pause"))
        }
    }

    @objc func seek(_ call: CAPPluginCall) {
        let position = max(0, call.getDouble("position") ?? 0)
        DispatchQueue.main.async { [weak self] in
            guard let self, self.currentTrack != nil else {
                call.reject("No track is loaded", "NO_TRACK")
                return
            }
            self.seek(to: position)
            call.resolve(self.playbackState(reason: "time"))
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.currentTrack != nil else {
                call.reject("No track is loaded", "NO_TRACK")
                return
            }
            call.resolve(self.playbackState(reason: "time"))
        }
    }

    private func syncWebCookies(completion: @escaping () -> Void) {
        guard let cookieStore = webView?.configuration.websiteDataStore.httpCookieStore else {
            DispatchQueue.main.async(execute: completion)
            return
        }

        cookieStore.getAllCookies { cookies in
            cookies.forEach(HTTPCookieStorage.shared.setCookie)
            DispatchQueue.main.async(execute: completion)
        }
    }

    private func ensureConfigured() {
        guard !isConfigured else {
            installRemoteCommands()
            return
        }
        isConfigured = true
        player.automaticallyWaitsToMinimizeStalling = true

        periodicObserver = player.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.5, preferredTimescale: 600),
            queue: .main
        ) { [weak self] _ in
            guard let self, self.currentTrack != nil else { return }
            self.publishNowPlaying()
            self.emitState(reason: "time", retain: false)
        }

        playbackObservation = player.observe(
            \.timeControlStatus,
            options: [.new]
        ) { [weak self] _, _ in
            DispatchQueue.main.async {
                guard let self, self.currentTrack != nil else { return }
                self.publishNowPlaying()
            }
        }

        endedObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self,
                  let item = notification.object as? AVPlayerItem,
                  item === self.player.currentItem else { return }
            self.advanceToNext(reason: "ended")
        }

        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { [weak self] notification in
            self?.handleInterruption(notification)
        }

        routeObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { [weak self] notification in
            guard let rawReason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                  AVAudioSession.RouteChangeReason(rawValue: rawReason) == .oldDeviceUnavailable else {
                return
            }
            self?.pausePlayback(reason: "pause")
        }

        installRemoteCommands()
    }

    private func loadCurrentTrack(position: Double, reason: String) {
        guard let track = currentTrack else { return }

        itemStatusObservation?.invalidate()
        artworkTask?.cancel()

        let cookies = HTTPCookieStorage.shared.cookies(for: track.audioURL) ?? []
        let asset = AVURLAsset(
            url: track.audioURL,
            options: [AVURLAssetHTTPCookiesKey: cookies]
        )
        let item = AVPlayerItem(asset: asset)
        player.replaceCurrentItem(with: item)

        itemStatusObservation = item.observe(\.status, options: [.new]) {
            [weak self, weak item] observedItem, _ in
            DispatchQueue.main.async {
                guard let self, let item, item === self.player.currentItem else { return }
                if observedItem.status == .readyToPlay {
                    if position > 0 { self.seek(to: position) }
                    if self.wantsPlayback { self.startPlayback(reason: reason) }
                    self.publishNowPlaying()
                    self.emitState(reason: reason)
                } else if observedItem.status == .failed {
                    self.wantsPlayback = false
                    self.player.pause()
                    self.publishNowPlaying()
                    self.emitState(reason: "error")
                }
            }
        }

        loadArtwork(for: track)
        publishNowPlaying()
        if wantsPlayback { startPlayback(reason: reason) }
        emitState(reason: reason)
    }

    private func startPlayback(reason: String) {
        guard currentTrack != nil else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
            wantsPlayback = true
            player.play()
            publishNowPlaying()
            emitState(reason: reason)
        } catch {
            wantsPlayback = false
            player.pause()
            publishNowPlaying()
            emitState(reason: "error")
        }
    }

    private func pausePlayback(reason: String) {
        wantsPlayback = false
        player.pause()
        publishNowPlaying()
        emitState(reason: reason)
    }

    private func seek(to position: Double) {
        let duration = playbackDuration()
        let clamped = duration > 0 ? min(position, duration) : position
        player.seek(
            to: CMTime(seconds: clamped, preferredTimescale: 600),
            toleranceBefore: .zero,
            toleranceAfter: .zero
        )
        publishNowPlaying()
        emitState(reason: "time", retain: false)
    }

    private func advanceToNext(reason: String) {
        guard !tracks.isEmpty else { return }
        if reason == "ended" && repeatMode == "one" {
            seek(to: 0)
            startPlayback(reason: "play")
            return
        }

        let nextIndex = queueIndex + 1
        if nextIndex < tracks.count {
            queueIndex = nextIndex
        } else if repeatMode == "all" {
            queueIndex = 0
        } else {
            pausePlayback(reason: "ended")
            return
        }

        wantsPlayback = true
        loadCurrentTrack(position: 0, reason: reason == "ended" ? "ended" : "next")
    }

    private func advanceToPrevious() {
        guard !tracks.isEmpty else { return }
        queueIndex = queueIndex > 0 ? queueIndex - 1 : tracks.count - 1
        wantsPlayback = true
        loadCurrentTrack(position: 0, reason: "previous")
    }

    private func handleInterruption(_ notification: Notification) {
        guard let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: rawType) else { return }

        if type == .began {
            player.pause()
            publishNowPlaying()
            emitState(reason: "pause")
            return
        }

        let rawOptions = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
        let options = AVAudioSession.InterruptionOptions(rawValue: rawOptions)
        if wantsPlayback && options.contains(.shouldResume) {
            startPlayback(reason: "play")
        } else {
            wantsPlayback = false
            publishNowPlaying()
            emitState(reason: "pause")
        }
    }

    private func installRemoteCommands() {
        let commands = MPRemoteCommandCenter.shared()

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
            guard let self, self.currentTrack != nil else { return .noSuchContent }
            self.startPlayback(reason: "play")
            return .success
        }

        commands.pauseCommand.removeTarget(nil)
        commands.pauseCommand.isEnabled = true
        commands.pauseCommand.addTarget { [weak self] _ in
            guard let self, self.currentTrack != nil else { return .noSuchContent }
            self.pausePlayback(reason: "pause")
            return .success
        }

        commands.previousTrackCommand.removeTarget(nil)
        commands.previousTrackCommand.isEnabled = tracks.count > 1
        commands.previousTrackCommand.addTarget { [weak self] _ in
            guard let self, self.tracks.count > 1 else { return .noSuchContent }
            self.advanceToPrevious()
            return .success
        }

        commands.nextTrackCommand.removeTarget(nil)
        commands.nextTrackCommand.isEnabled = tracks.count > 1
        commands.nextTrackCommand.addTarget { [weak self] _ in
            guard let self, self.tracks.count > 1 else { return .noSuchContent }
            self.advanceToNext(reason: "next")
            return .success
        }

        commands.changePlaybackPositionCommand.removeTarget(nil)
        commands.changePlaybackPositionCommand.isEnabled = true
        commands.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self,
                  let positionEvent = event as? MPChangePlaybackPositionCommandEvent,
                  self.currentTrack != nil else { return .noSuchContent }
            self.seek(to: positionEvent.positionTime)
            return .success
        }
    }

    private func loadArtwork(for track: HymnzPlaybackTrack) {
        guard let url = track.artworkURL else {
            publishNowPlaying()
            return
        }
        if artworkCache[url] != nil {
            publishNowPlaying()
            return
        }

        artworkTask = URLSession.shared.dataTask(with: url) { [weak self] data, response, _ in
            guard let self,
                  let response = response as? HTTPURLResponse,
                  (200..<300).contains(response.statusCode),
                  let data,
                  let image = UIImage(data: data) else { return }
            let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }

            DispatchQueue.main.async {
                guard self.currentTrack?.id == track.id else { return }
                self.artworkCache[url] = artwork
                self.publishNowPlaying()
            }
        }
        artworkTask?.resume()
    }

    private func publishNowPlaying() {
        guard let track = currentTrack else {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            return
        }

        var info: [String: Any] = [
            MPMediaItemPropertyTitle: track.title,
            MPMediaItemPropertyArtist: track.artist,
            MPMediaItemPropertyAlbumTitle: "HYMNZ",
            MPNowPlayingInfoPropertyExternalContentIdentifier: track.id,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: playbackPosition(),
            MPNowPlayingInfoPropertyPlaybackRate: player.rate > 0 ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyDefaultPlaybackRate: 1.0,
            MPNowPlayingInfoPropertyPlaybackQueueCount: tracks.count,
            MPNowPlayingInfoPropertyPlaybackQueueIndex: queueIndex,
            MPNowPlayingInfoPropertyIsLiveStream: false
        ]

        let duration = playbackDuration()
        if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
        if let url = track.artworkURL, let artwork = artworkCache[url] {
            info[MPMediaItemPropertyArtwork] = artwork
        } else if let artwork = defaultArtwork() {
            info[MPMediaItemPropertyArtwork] = artwork
        }

        let center = MPNowPlayingInfoCenter.default()
        center.nowPlayingInfo = info
        center.playbackState = player.rate > 0 ? .playing : .paused
    }

    private func defaultArtwork() -> MPMediaItemArtwork? {
        if let fallbackArtwork { return fallbackArtwork }
        guard let image = UIImage(named: "AppIcon") else { return nil }
        let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        fallbackArtwork = artwork
        return artwork
    }

    private func playbackPosition() -> Double {
        let seconds = player.currentTime().seconds
        return seconds.isFinite && seconds > 0 ? seconds : 0
    }

    private func playbackDuration() -> Double {
        let itemDuration = player.currentItem?.duration.seconds ?? 0
        if itemDuration.isFinite && itemDuration > 0 { return itemDuration }
        let metadataDuration = currentTrack?.duration ?? 0
        return metadataDuration.isFinite && metadataDuration > 0 ? metadataDuration : 0
    }

    private func playbackState(reason: String) -> JSObject {
        return [
            "trackId": currentTrack?.id ?? "",
            "queueIndex": queueIndex,
            "queueCount": tracks.count,
            "position": playbackPosition(),
            "duration": playbackDuration(),
            "isPlaying": player.rate > 0 || (wantsPlayback && player.timeControlStatus == .waitingToPlayAtSpecifiedRate),
            "reason": reason
        ]
    }

    private func emitState(reason: String, retain: Bool = true) {
        notifyListeners(
            "playbackState",
            data: playbackState(reason: reason),
            retainUntilConsumed: retain
        )
    }
}
