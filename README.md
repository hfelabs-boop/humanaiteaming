# SentinelTrack AI

A human–autonomy teaming testbed for target tracking. Operators find and neutralise moving targets with dwell-based
interaction while the browser camera watches their presence and attention. When the operator leaves the camera's safe zone or
looks away, an autonomous agent takes over. Control comes back through a handshake protocol.

## Session flow

| Phase | What happens |
| --- | --- |
| **1. Intro / briefing** | Mission overview, the three control modes, an optional Operator ID (stamped on reports), and a privacy note. Experienced operators can skip ahead to training or to the mission. |
| **2. Tutorial** | Six briefing cards: the field (targets and distractors), operator monitoring, manual engagement (animated), the teaming protocol, autonomy and handshake, and a controls reference. Use ←/→ or Enter to move through the cards. |
| **3. Training** | Six guided drills on the live simulation with a gentler field (fewer targets that live longer). A coach panel shows the objective, progress and context hints, and the next drill starts automatically. Failsafe takeovers are paused and nothing is scored. |
| **4. Mission** | A 3-2-1 countdown, then the scored session with the live failsafe. **FINISH** opens the debrief, which you can export as `.txt` or `.csv`. |

### Training drills

1. **Sensor Calibration**: hold a TRACKING lock for 2 s, or bypass the sensors if there is no camera.
2. **Manual Engagement**: neutralise 3 targets with magnet assist off.
3. **Magnet Assist**: press `N`, then neutralise 2 targets.
4. **Teaming Protocol**: press `T`, then verify 5 AI-locked targets (`Q` = odd, `W` = even).
5. **Autonomous Delegation**: press `A` and let the AI neutralise 3 targets.
6. **Handshake Recovery**: a sensor loss is simulated; reclaim control through the handshake panel.

Progress counts only when you do the action in the mode the drill teaches. You can skip any drill, end training early,
or repeat it. Results go into the mission report and the CSV event log.

## Controls

| Key | Action |
| --- | --- |
| `M` | Manual control |
| `T` | Teaming mode |
| `A` | Delegate to AI autonomy |
| `N` | Toggle magnet assist (manual mode) |
| `Q` / `W` | Odd / even verification (teaming mode) |
| `1`–`5` | Number of AI agents |
| `H` / `?` | Operator reference (tutorial) |
| `Esc` | Pause menu: resume, restart, replay training, report, return to briefing |

The gear icon (bottom-left) opens System Parameters: camera feed, debug overlay, safe-zone size, attention sensitivity,
handshake-on-distraction, audio alarm, AI agents, target density, lifespan and respawn interval.

## Run locally

Prerequisite: Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

The browser asks for camera access. Face detection uses MediaPipe Tasks Vision (BlazeFace). It runs entirely in the
browser, and the WASM runtime and model are fetched from public CDNs on first load. Video is never recorded or uploaded.

## Data export

- **Summary (.txt)**: operator ID, duration, accuracy per mode, average reaction latencies (with sample counts), sensor
  integrity counts, and training results.
- **Event log (.csv)**: `OperatorId, Timestamp, RelativeTimeMs, EventType, Agent, Details`. Event types are
  `SESSION_START`, `TRAINING`, `MODE_CHANGE`, `HIT`, `MISS`, `ERROR_BOUNDS`, `ERROR_DISTRACTION` and `SESSION_END`.

## Project structure

```
src/
  App.tsx                    phase flow, failsafe logic, training engine, HUD
  training.ts                drill curriculum + pure training-state helpers
  types.ts / constants.ts    shared types and tuning constants
  components/
    IntroScreen.tsx          phase 1 briefing
    TutorialModal.tsx        phase 2 tutorial + in-session help (H)
    TrainingCoach.tsx        phase 3 drill coach panel
    TrainingComplete.tsx     training summary → begin mission
    MissionCountdown.tsx     pre-mission countdown
    SimulationCanvas.tsx     entities, dwell/lock, AI agents, teaming task
    WebcamTracker.tsx        MediaPipe face/attention tracking + bypass
    RecoveryModal.tsx        handshake protocol
    ReportModal.tsx          mission debrief
    DebugPanel.tsx           system parameters
    SystemLog.tsx            live system log
```
