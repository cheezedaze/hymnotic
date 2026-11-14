import Foundation

/// A bounded recovery budget for one track. Do not skip tracks or retry forever.
struct PlaybackStallRecovery {
    enum Action { case none, reload, stop }
    private var waitingSince: TimeInterval?
    private var retried = false
    let timeout: TimeInterval

    init(timeout: TimeInterval = 15) { self.timeout = timeout }

    mutating func reset() {
        waitingSince = nil
        retried = false
    }

    mutating func evaluate(waiting: Bool, wantsPlayback: Bool, now: TimeInterval) -> Action {
        guard wantsPlayback && waiting else {
            waitingSince = nil
            return .none
        }
        guard let since = waitingSince else {
            waitingSince = now
            return .none
        }
        guard now - since >= timeout else { return .none }
        waitingSince = nil
        if retried { return .stop }
        retried = true
        return .reload
    }
}
