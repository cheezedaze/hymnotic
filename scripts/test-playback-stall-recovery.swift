import Foundation

@main
struct PlaybackStallRecoveryTests {
    static func main() {
        var policy = PlaybackStallRecovery(timeout: 15)
        func waiting(_ time: Double) -> PlaybackStallRecovery.Action {
            policy.evaluate(waiting: true, wantsPlayback: true, now: time)
        }
        assert(waiting(0) == .none)
        assert(waiting(14) == .none, "Brief buffering must not interrupt playback")
        assert(waiting(15) == .reload, "One retry after 15 seconds")
        assert(waiting(16) == .none)
        assert(waiting(31) == .stop, "Must not retry indefinitely")
        policy.reset()
        assert(waiting(40) == .none)
        assert(policy.evaluate(waiting: true, wantsPlayback: false, now: 50) == .none)
        assert(waiting(60) == .none, "Pause/interruption cancels elapsed wait")
        assert(waiting(75) == .reload)
        assert(policy.evaluate(waiting: false, wantsPlayback: true, now: 76) == .none)
        assert(waiting(100) == .none)
        assert(waiting(115) == .stop, "Playing briefly must not grant unlimited retries")
        policy.reset()
        assert(waiting(200) == .none)
        assert(waiting(215) == .reload, "New track/manual retry gets a fresh budget")
        print("PlaybackStallRecovery: all checks passed")
    }
}
