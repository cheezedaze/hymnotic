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
    let previewLimit: Double?

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
        let limit = (object["previewLimit"] as? NSNumber)?.doubleValue
        self.previewLimit = limit.flatMap { $0 > 0 ? $0 : nil }
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
    private lazy var nowPlayingSession = MPNowPlayingSession(players: [player])
    private var tracks: [HymnzPlaybackTrack] = []
    private var queueID: String?
    private var queueIndex = 0
    private var queueRevision = 0
    private var repeatMode = "off"
    private var shuffleEnabled = false
    private var wantsPlayback = false
    private var isConfigured = false
    private var periodicObserver: Any?
    private var itemStatusObservation: NSKeyValueObservation?
    private var playbackObservation: NSKeyValueObservation?
    private var endedObserver: NSObjectProtocol?
    private var interruptionObserver: NSObjectProtocol?
    private var routeObserver: NSObjectProtocol?
    private var stallTimer: Timer?
    private var stallRecovery = PlaybackStallRecovery()
    private var recoveryPosition: Double = 0
    private var resumeAfterStall = false
    private var interrupted = false
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
        let requestedShuffle = call.getBool("shuffle") ?? false
        let requestedQueueID = call.getString("queueId")
        let requestedRevision = max(0, call.getInt("revision") ?? 0)

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Native player is unavailable", "PLAYER_UNAVAILABLE")
                return
            }
            guard requestedRevision >= self.queueRevision else {
                call.resolve(self.playbackState(reason: "loaded"))
                return
            }
            self.queueRevision = requestedRevision

            self.syncWebCookies { [weak self] in
                guard let self else {
                    call.reject("Native player is unavailable", "PLAYER_UNAVAILABLE")
                    return
                }
                guard requestedRevision == self.queueRevision else {
                    call.resolve(self.playbackState(reason: "loaded"))
                    return
                }

                self.ensureConfigured()
                let requestedTrack = parsedTracks[requestedIndex]
                let needsNewItem = self.currentTrack?.id != requestedTrack.id ||
                    self.currentTrack?.audioURL != requestedTrack.audioURL ||
                    self.player.currentItem == nil

                self.tracks = parsedTracks
                self.queueID = requestedQueueID
                self.queueIndex = requestedIndex
                self.repeatMode = ["off", "all", "one"].contains(requestedRepeat)
                    ? requestedRepeat
                    : "off"
                self.shuffleEnabled = requestedShuffle
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
        nowPlayingSession.automaticallyPublishesNowPlayingInfo = false

        periodicObserver = player.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.5, preferredTimescale: 600),
            queue: .main
        ) { [weak self] _ in
            guard let self, self.currentTrack != nil else { return }
            if self.player.rate > 0 { self.recoveryPosition = self.playbackPosition() }
            if let limit = self.currentTrack?.previewLimit,
               self.wantsPlayback,
               self.playbackPosition() >= limit {
                self.wantsPlayback = false
                self.player.pause()
                self.player.seek(
                    to: CMTime(seconds: limit, preferredTimescale: 600),
                    toleranceBefore: .zero,
                    toleranceAfter: .zero
                )
                self.publishNowPlaying()
                self.emitState(reason: "previewEnded")
                return
            }
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

    private func loadCurrentTrack(position: Double, reason: String, recovering: Bool = false) {
        guard let track = currentTrack else { return }

        recoveryPosition = position
        if !recovering { stallRecovery.reset() }
        resumeAfterStall = false
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
                    self.stopAfterPlaybackFailure()
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
        if resumeAfterStall || player.currentItem?.status == .failed {
            wantsPlayback = true
            loadCurrentTrack(position: max(playbackPosition(), recoveryPosition), reason: reason)
            return
        }
        interrupted = false
        ensureStallTimer()
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
            wantsPlayback = true
            player.play()
            nowPlayingSession.becomeActiveIfPossible { [weak self] isActive in
                guard isActive else { return }
                DispatchQueue.main.async {
                    self?.installRemoteCommands()
                    self?.publishNowPlaying()
                }
            }
            publishNowPlaying()
            emitState(reason: reason)
        } catch {
            wantsPlayback = false
            player.pause()
            publishNowPlaying()
            emitState(reason: "error")
        }
    }

    private func ensureStallTimer() {
        guard stallTimer == nil else { return }
        stallTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
            guard let self else { timer.invalidate(); return }
            let action = self.stallRecovery.evaluate(
                waiting: self.player.timeControlStatus == .waitingToPlayAtSpecifiedRate || self.player.rate == 0,
                wantsPlayback: self.wantsPlayback && !self.interrupted,
                now: ProcessInfo.processInfo.systemUptime
            )
            switch action {
            case .none: break
            case .reload:
                let position = max(self.playbackPosition(), self.recoveryPosition)
                self.loadCurrentTrack(position: position, reason: "loaded", recovering: true)
            case .stop:
                self.stopAfterPlaybackFailure()
            }
        }
    }

    private func stopAfterPlaybackFailure() {
        wantsPlayback = false
        resumeAfterStall = true
        player.pause()
        publishNowPlaying()
        emitState(reason: "error")
    }

    private func pausePlayback(reason: String) {
        wantsPlayback = false
        _ = stallRecovery.evaluate(waiting: false, wantsPlayback: false, now: 0)
        player.pause()
        publishNowPlaying()
        emitState(reason: reason)
    }

    private func seek(to position: Double) {
        let duration = playbackDuration()
        let clamped = duration > 0 ? min(position, duration) : position
        recoveryPosition = clamped
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

        let completedTrackID = currentTrack?.id
        let nextIndex = queueIndex + 1
        if nextIndex < tracks.count {
            queueIndex = nextIndex
        } else if shuffleEnabled {
            tracks.shuffle()
            if tracks.count > 1, tracks.first?.id == completedTrackID {
                tracks.swapAt(0, 1)
            }
            queueIndex = 0
        } else if repeatMode == "all" || reason == "next" {
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
            interrupted = true
            _ = stallRecovery.evaluate(waiting: false, wantsPlayback: false, now: 0)
            player.pause()
            publishNowPlaying()
            emitState(reason: "pause")
            return
        }

        interrupted = false
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
        let commands = nowPlayingSession.remoteCommandCenter

        commands.skipBackwardCommand.removeTarget(nil)
        commands.skipBackwardCommand.isEnabled = false
        commands.skipForwardCommand.removeTarget(nil)
        commands.skipForwardCommand.isEnabled = false
        commands.seekBackwardCommand.removeTarget(nil)
        commands.seekBackwardCommand.isEnabled = false
        commands.seekForwardCommand.removeTarget(nil)
        commands.seekForwardCommand.isEnabled = false
        commands.togglePlayPauseCommand.removeTarget(nil)
        commands.togglePlayPauseCommand.isEnabled = true
        commands.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self, self.currentTrack != nil else { return .noSuchContent }
            if self.player.rate > 0 || self.wantsPlayback {
                self.pausePlayback(reason: "pause")
            } else {
                self.startPlayback(reason: "play")
            }
            return .success
        }

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
            nowPlayingSession.nowPlayingInfoCenter.nowPlayingInfo = nil
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

        let center = nowPlayingSession.nowPlayingInfoCenter
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
            "revision": queueRevision,
            "trackId": currentTrack?.id ?? "",
            "queueId": queueID ?? "",
            "queueTrackIds": tracks.map(\.id),
            "queueIndex": queueIndex,
            "queueCount": tracks.count,
            "position": playbackPosition(),
            "duration": playbackDuration(),
            "isPlaying": player.rate > 0 || (wantsPlayback && player.timeControlStatus == .waitingToPlayAtSpecifiedRate),
            "shuffle": shuffleEnabled,
            "repeat": repeatMode,
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
