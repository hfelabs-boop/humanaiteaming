import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import SimulationCanvas, { MissReason } from './components/SimulationCanvas';
import WebcamTracker, { TrackerStatus } from './components/WebcamTracker';
import RecoveryModal from './components/RecoveryModal';
import TutorialModal from './components/TutorialModal';
import ReportModal from './components/ReportModal';
import DebugPanel from './components/DebugPanel';
import SystemLog, { LogEntry } from './components/SystemLog';
import IntroScreen from './components/IntroScreen';
import TrainingCoach from './components/TrainingCoach';
import TrainingComplete from './components/TrainingComplete';
import MissionCountdown from './components/MissionCountdown';
import { AppMode, AppPhase, GameConfig, GameStats, SessionAnalytics, AnalyticsEvent, TrainingState } from './types';
import {
  Bot, ScanEye, MousePointer2, Users, Magnet, Trophy, Pause, Play, RotateCcw, HelpCircle, CheckCircle,
  ShieldAlert, GraduationCap, Rocket, Home,
} from 'lucide-react';
import { CONFIG } from './constants';
import {
  TRAINING_DRILLS, TRAINING_FIELD, addTrainingError, addTrainingProgress, advanceTraining,
  createTrainingState, drillDurationSec, skipTrainingDrill,
} from './training';

const EMPTY_STATS: GameStats = { humanHits: 0, humanMisses: 0, teamingHits: 0, teamingMisses: 0, aiHits: 0, aiMisses: 0 };

const createAnalytics = (): SessionAnalytics => ({
  startTime: Date.now(),
  totalSessionTime: 0,
  outOfBoundsCount: 0,
  distractionCount: 0,
  events: [],
  rtDetectionManual: [],
  rtNeutralizationManual: [],
  rtNeutralizationAi: [],
  rtNeutralizationTeaming: [],
});

const getRatio = (hits: number, misses: number) => {
  const total = hits + misses;
  if (total === 0) return 0;
  return Math.round((hits / total) * 100);
};

const calculateAverage = (arr: number[]) => {
  if (arr.length === 0) return '0';
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0);
};

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

const downloadBlob = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const App: React.FC = () => {
  // ---------------- FLOW ----------------
  const [phase, setPhase] = useState<AppPhase>('INTRO');
  const [operatorId, setOperatorId] = useState('');
  const [training, setTraining] = useState<TrainingState | null>(null);
  const [countdownActive, setCountdownActive] = useState(false);
  const trainingSummaryRef = useRef<TrainingState | null>(null);

  const [mode, setMode] = useState<AppMode>(AppMode.MANUAL);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isAiOverride, setIsAiOverride] = useState(false);
  const [gestureToast, setGestureToast] = useState<{ msg: string; type: string; id: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState(0);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);
  const [bypassSignal, setBypassSignal] = useState(0);

  // ---------------- SYSTEM LOG ----------------
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const logCounter = useRef(0);
  const addSystemLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = { id: logCounter.current++, text, type, timestamp: Date.now() };
    setSystemLogs(prev => [...prev.slice(-50), newLog]);
  }, []);

  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>('INITIALIZING');

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const warningOscRef = useRef<OscillatorNode | null>(null);
  const warningNodesRef = useRef<AudioNode[]>([]);

  // ---------------- CONFIG ----------------
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    safeZoneScale: 0.5,
    faceConfidenceThreshold: 0.5,
    showDebugOverlay: false,
    showCameraFeed: true,
    enableAttentionCheck: true,
    attentionSensitivity: 0.25,
    aiTargetColor: '#3b82f6',
    teamingCrosshairColor: '#FFFF00',
    entityCount: CONFIG.ENTITY_COUNT,
    aiAgentCount: 1,
    minLifespan: CONFIG.LIFESPAN_MIN_MS,
    maxLifespan: CONFIG.LIFESPAN_MAX_MS,
    spawnInterval: 500,
    magnetAssist: false,
    handshakeOnDistraction: true,
    audio: { enabled: false, frequency: 440, type: 'sawtooth', loop: true },
  });

  // Training runs on an easier field; the mission uses the operator's configured field.
  const effectiveConfig = useMemo<GameConfig>(
    () => (phase === 'TRAINING' ? { ...gameConfig, ...TRAINING_FIELD } : gameConfig),
    [phase, gameConfig],
  );

  // ---------------- STATS / ANALYTICS ----------------
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const analyticsRef = useRef<SessionAnalytics>(createAnalytics());

  // Refs mirror state for callbacks fired from animation / sensor loops.
  const phaseRef = useRef(phase);
  const modeRef = useRef(mode);
  const magnetRef = useRef(gameConfig.magnetAssist);
  const trackerStatusRef = useRef(trackerStatus);
  const isAiOverrideRef = useRef(isAiOverride);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { magnetRef.current = gameConfig.magnetAssist; }, [gameConfig.magnetAssist]);
  useEffect(() => { isAiOverrideRef.current = isAiOverride; }, [isAiOverride]);

  const trainingFinished = phase === 'TRAINING' && !!training?.finished;
  const simPaused =
    phase === 'INTRO' || phase === 'TUTORIAL' || isPaused || showHelp || showReport || countdownActive || trainingFinished;
  const simPausedRef = useRef(simPaused);
  useEffect(() => { simPausedRef.current = simPaused; }, [simPaused]);

  const logEvent = useCallback((eventType: AnalyticsEvent['eventType'], agent: AnalyticsEvent['agent'], details: string) => {
    if (phaseRef.current !== 'MISSION') return;
    const now = Date.now();
    analyticsRef.current.events.push({
      timestamp: now,
      relativeTime: now - analyticsRef.current.startTime,
      eventType,
      agent,
      details,
    });
  }, []);

  const resetAnalytics = useCallback(() => {
    const fresh = createAnalytics();
    fresh.events.push({ timestamp: fresh.startTime, relativeTime: 0, eventType: 'SESSION_START', agent: 'SYSTEM', details: 'New Mission Session Initialized' });
    const t = trainingSummaryRef.current;
    if (t) {
      t.results.forEach((r, i) => {
        fresh.events.push({
          timestamp: fresh.startTime,
          relativeTime: 0,
          eventType: 'TRAINING',
          agent: 'HUMAN',
          details: `${TRAINING_DRILLS[i].title}: ${r.status.toUpperCase()} (${drillDurationSec(r)}s, ${r.errors} errors)`,
        });
      });
    }
    analyticsRef.current = fresh;
  }, []);

  // Resize
  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------- AUDIO ----------------
  const stopWarningSound = useCallback(() => {
    if (warningOscRef.current) {
      try {
        warningOscRef.current.stop();
        warningOscRef.current.disconnect();
      } catch { /* already stopped */ }
      warningOscRef.current = null;
    }
    warningNodesRef.current.forEach(n => {
      try {
        if (n instanceof OscillatorNode) n.stop();
        n.disconnect();
      } catch { /* ignore */ }
    });
    warningNodesRef.current = [];
  }, []);

  const playWarningSound = useCallback(() => {
    if (!gameConfig.audio.enabled) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    if (warningOscRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = gameConfig.audio.type;
    osc.frequency.setValueAtTime(gameConfig.audio.frequency, ctx.currentTime);

    if (gameConfig.audio.loop) {
      osc.frequency.exponentialRampToValueAtTime(gameConfig.audio.frequency * 2, ctx.currentTime + 0.1);
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.1;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      warningOscRef.current = osc;
      warningNodesRef.current = [lfo, lfoGain, gain];
    } else {
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      warningOscRef.current = osc;
      osc.onended = () => { warningOscRef.current = null; };
    }
  }, [gameConfig.audio]);

  useEffect(() => {
    const shouldPlay = trackerStatus === 'OUT_OF_BOUNDS' && phase === 'MISSION' && !simPaused;
    if (shouldPlay) playWarningSound();
    else stopWarningSound();
    return () => stopWarningSound();
  }, [trackerStatus, phase, simPaused, playWarningSound, stopWarningSound]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!gestureToast) return;
    const timer = setTimeout(() => setGestureToast(null), 1200);
    return () => clearTimeout(timer);
  }, [gestureToast]);

  const showToast = useCallback((msg: string, type: string) => setGestureToast({ msg, type, id: Date.now() }), []);

  // ---------------- FAILSAFE (MISSION ONLY) ----------------
  const applyFailsafe = useCallback((status: TrackerStatus) => {
    if (phaseRef.current !== 'MISSION' || simPausedRef.current) return;
    const current = modeRef.current;

    if (isAiOverrideRef.current) {
      if (current !== AppMode.AI_AUTONOMY) setMode(AppMode.AI_AUTONOMY);
      return;
    }

    if (status === 'TRACKING') {
      if (current === AppMode.AI_AUTONOMY) {
        logEvent('MODE_CHANGE', 'SYSTEM', 'Transition Recovery Initiated');
        addSystemLog('PROTOCOL: Initiating Handshake Recovery', 'system');
        setMode(AppMode.TRANSITION_RECOVERY);
      }
      return;
    }

    if (status === 'DISTRACTED') {
      if (gameConfig.handshakeOnDistraction && current !== AppMode.AI_AUTONOMY) {
        logEvent('MODE_CHANGE', 'AI', 'Distraction - Forced Autonomy');
        addSystemLog('FAILSAFE: Distraction - Engaging Autonomy', 'warning');
        setMode(AppMode.AI_AUTONOMY);
      }
      return;
    }

    if (status === 'OUT_OF_BOUNDS' || status === 'SEARCHING') {
      if (current !== AppMode.AI_AUTONOMY) {
        logEvent('MODE_CHANGE', 'AI', 'Sensor Loss - Forced Autonomy');
        addSystemLog('FAILSAFE: Sensor Loss - Engaging Autonomy', 'warning');
        setMode(AppMode.AI_AUTONOMY);
      }
    }
  }, [gameConfig.handshakeOnDistraction, logEvent, addSystemLog]);

  const handleTrackerStatusChange = useCallback((newStatus: TrackerStatus) => {
    trackerStatusRef.current = newStatus;
    setTrackerStatus(newStatus);

    if (phaseRef.current === 'TRAINING' || phaseRef.current === 'MISSION') {
      if (newStatus === 'OUT_OF_BOUNDS') addSystemLog('SENSOR LOST: Operator Out of Bounds', 'warning');
      if (newStatus === 'DISTRACTED') addSystemLog('ATTENTION DRIFT DETECTED', 'warning');
      if (newStatus === 'TRACKING') addSystemLog('Sensor Lock Re-acquired', 'success');
      if (newStatus === 'DISABLED') addSystemLog('SENSORS BYPASSED: Failsafe disabled', 'info');
    }
    applyFailsafe(newStatus);
  }, [addSystemLog, applyFailsafe]);

  // Re-evaluate the failsafe when the mission resumes (status may have changed while paused).
  useEffect(() => {
    if (phase === 'MISSION' && !simPaused) applyFailsafe(trackerStatusRef.current);
  }, [phase, simPaused, applyFailsafe]);

  const handleTrackingError = useCallback((error: 'bounds' | 'distraction') => {
    if (phaseRef.current !== 'MISSION' || simPausedRef.current) return;
    if (error === 'bounds') {
      analyticsRef.current.outOfBoundsCount++;
      logEvent('ERROR_BOUNDS', 'HUMAN', 'Face out of safe zone');
    }
    if (error === 'distraction') {
      analyticsRef.current.distractionCount++;
      logEvent('ERROR_DISTRACTION', 'HUMAN', 'Attention gaze lost');
    }
  }, [logEvent]);

  const handleFaceUpdate = useCallback(() => { /* status-driven; kept for tracker API */ }, []);

  // ---------------- MODE CONTROLS ----------------
  const confirmControl = useCallback(() => {
    setIsAiOverride(false);
    setMode(AppMode.MANUAL);
    logEvent('MODE_CHANGE', 'HUMAN', 'Manual Control Resumed');
    addSystemLog('CONTROL: Manual Operator Restored', 'success');
  }, [logEvent, addSystemLog]);

  const rejectControl = useCallback(() => {
    setIsAiOverride(true);
    setMode(AppMode.AI_AUTONOMY);
    logEvent('MODE_CHANGE', 'HUMAN', 'Recovery Rejected - Stay Autonomous');
    addSystemLog('CONTROL: User rejected handover. Autonomy maintained.', 'info');
  }, [logEvent, addSystemLog]);

  const switchToTeaming = useCallback(() => {
    setIsAiOverride(false);
    setMode(AppMode.TEAMING);
    logEvent('MODE_CHANGE', 'HUMAN', 'Teaming Mode Activated');
    addSystemLog('MODE SWITCH: Teaming Protocol Active', 'system');
  }, [logEvent, addSystemLog]);

  const manualForceSwitch = useCallback(() => {
    setIsAiOverride(false);
    setMode(AppMode.MANUAL);
    logEvent('MODE_CHANGE', 'HUMAN', 'Manual Mode Forced');
    addSystemLog('MODE SWITCH: Manual Control Active', 'system');
  }, [logEvent, addSystemLog]);

  const autoForceSwitch = useCallback(() => {
    setIsAiOverride(true);
    setMode(AppMode.AI_AUTONOMY);
    logEvent('MODE_CHANGE', 'HUMAN', 'Autonomous Mode Forced');
    addSystemLog('MODE SWITCH: AI Autonomy Active', 'system');
  }, [logEvent, addSystemLog]);

  const toggleMagnet = useCallback((value?: boolean) => {
    setGameConfig(prev => {
      const newVal = value ?? !prev.magnetAssist;
      return { ...prev, magnetAssist: newVal };
    });
  }, []);

  // Toast + log for magnet changes (kept out of the state updater so StrictMode does not double-log).
  const prevMagnet = useRef(gameConfig.magnetAssist);
  useEffect(() => {
    if (prevMagnet.current === gameConfig.magnetAssist) return;
    prevMagnet.current = gameConfig.magnetAssist;
    if (phaseRef.current === 'INTRO') return;
    const on = gameConfig.magnetAssist;
    showToast(`MAGNET ASSIST ${on ? 'ENABLED' : 'DISABLED'}`, on ? 'text-cyan-400' : 'text-slate-500');
    addSystemLog(`ASSIST: Magnet ${on ? 'ENGAGED' : 'DISENGAGED'}`, on ? 'system' : 'info');
  }, [gameConfig.magnetAssist, showToast, addSystemLog]);

  // ---------------- PHASE TRANSITIONS ----------------
  const resetField = useCallback(() => {
    setStats(EMPTY_STATS);
    setMode(AppMode.MANUAL);
    setIsAiOverride(false);
    setIsPaused(false);
    setShowHelp(false);
    setShowReport(false);
    setSessionEndTime(null);
    setGameConfig(p => ({ ...p, magnetAssist: false }));
    prevMagnet.current = false;
    setSessionId(prev => prev + 1);
    setSystemLogs([]);
  }, []);

  const startTutorial = useCallback(() => setPhase('TUTORIAL'), []);

  const startTraining = useCallback(() => {
    resetField();
    setTraining(createTrainingState());
    setPhase('TRAINING');
    addSystemLog('TRAINING: Guided session started', 'system');
  }, [resetField, addSystemLog]);

  const startMission = useCallback(() => {
    if (phaseRef.current === 'TRAINING') trainingSummaryRef.current = training;
    phaseRef.current = 'MISSION';
    resetField();
    resetAnalytics();
    setPhase('MISSION');
    setCountdownActive(true);
    addSystemLog('MISSION: Session initialized', 'system');
    addSystemLog(operatorId ? `Operator ${operatorId} on station` : 'Waiting for operator input...', 'info');
  }, [training, resetField, resetAnalytics, addSystemLog, operatorId]);

  const restartMission = useCallback(() => {
    resetField();
    resetAnalytics();
    setCountdownActive(true);
    addSystemLog('System Restarted', 'system');
  }, [resetField, resetAnalytics, addSystemLog]);

  const endCountdown = useCallback(() => setCountdownActive(false), []);

  const returnToIntro = useCallback(() => {
    resetField();
    setTraining(null);
    setCountdownActive(false);
    setPhase('INTRO');
  }, [resetField]);

  // ---------------- TRAINING ENGINE ----------------
  const currentDrill = phase === 'TRAINING' && training && !training.finished ? TRAINING_DRILLS[training.index] : null;
  const drillId = currentDrill?.id ?? null;
  const drillCompleted = !!training?.justCompleted;

  // Drill setup whenever a new drill becomes active.
  useEffect(() => {
    if (phase !== 'TRAINING' || !training || training.finished) return;
    const drill = TRAINING_DRILLS[training.index];
    addSystemLog(`TRAINING: Drill ${training.index + 1} — ${drill.title}`, 'system');
    if (drill.id === 'SENSOR' || drill.id === 'MANUAL') {
      setIsAiOverride(false);
      setMode(AppMode.MANUAL);
      setGameConfig(p => (p.magnetAssist ? { ...p, magnetAssist: false } : p));
    } else if (drill.id === 'MAGNET') {
      setIsAiOverride(false);
      setMode(AppMode.MANUAL);
    } else if (drill.id === 'HANDSHAKE') {
      setIsAiOverride(false);
      setMode(AppMode.AI_AUTONOMY);
      addSystemLog('TRAINING: Simulated sensor loss — AI assumes control', 'warning');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, training?.index, training?.finished]);

  // Advance after the "drill complete" flash.
  useEffect(() => {
    if (!drillCompleted) return;
    addSystemLog('TRAINING: Drill complete', 'success');
    const t = setTimeout(() => setTraining(p => (p ? advanceTraining(p) : p)), 1600);
    return () => clearTimeout(t);
  }, [drillCompleted, addSystemLog]);

  // Sensor calibration: require a continuous TRACKING lock (or a sensor bypass).
  useEffect(() => {
    if (drillId !== 'SENSOR' || drillCompleted || simPaused) return;
    let held = 0;
    const tick = setInterval(() => {
      const status = trackerStatusRef.current;
      if (status === 'DISABLED') {
        setTraining(p => (p ? addTrainingProgress(p, TRAINING_DRILLS[p.index].target, true) : p));
        return;
      }
      const nextHeld = status === 'TRACKING' ? held + 0.1 : 0;
      if (nextHeld !== held) {
        held = nextHeld;
        setTraining(p => (p ? addTrainingProgress(p, Math.round(held * 10) / 10, true) : p));
      }
    }, 100);
    return () => clearInterval(tick);
  }, [drillId, drillCompleted, simPaused]);

  // Handshake drill: after a short autonomous period, simulate operator re-detection.
  useEffect(() => {
    if (drillId !== 'HANDSHAKE' || drillCompleted || simPaused || mode !== AppMode.AI_AUTONOMY) return;
    const t = setTimeout(() => {
      setIsAiOverride(false);
      setMode(m => (m === AppMode.AI_AUTONOMY ? AppMode.TRANSITION_RECOVERY : m));
      addSystemLog('PROTOCOL: Operator re-detected — Handshake initiated', 'system');
    }, 3000);
    return () => clearTimeout(t);
  }, [drillId, drillCompleted, simPaused, mode, addSystemLog]);

  // Handshake drill completes when control leaves the recovery state to a human-in-the-loop mode.
  const prevModeRef = useRef(mode);
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (drillId !== 'HANDSHAKE' || drillCompleted) return;
    if (prev === AppMode.TRANSITION_RECOVERY && (mode === AppMode.MANUAL || mode === AppMode.TEAMING)) {
      setTraining(p => (p ? addTrainingProgress(p, 1) : p));
    }
  }, [mode, drillId, drillCompleted]);

  const skipDrill = useCallback(() => {
    setTraining(p => (p ? skipTrainingDrill(p) : p));
    addSystemLog('TRAINING: Drill skipped', 'info');
  }, [addSystemLog]);

  const endTraining = useCallback(() => {
    setTraining(p => {
      if (!p) return p;
      const results = p.results.map(r => (r.status === 'active' ? { ...r, status: 'skipped' as const, completedAt: Date.now() } : r));
      return { ...p, results, justCompleted: false, finished: true };
    });
  }, []);

  // ---------------- STAT UPDATES ----------------
  const handleStatUpdate = useCallback((
    type: 'hit' | 'miss',
    agent: 'human' | 'ai',
    detectionTime?: number,
    neutralizationTime?: number,
    reason?: MissReason,
  ) => {
    const currentMode = modeRef.current;

    if (phaseRef.current === 'TRAINING') {
      setTraining(p => {
        if (!p || p.finished || p.justCompleted) return p;
        const id = TRAINING_DRILLS[p.index].id;
        const magnet = magnetRef.current;
        if (type === 'hit') {
          if (id === 'MANUAL' && agent === 'human' && currentMode === AppMode.MANUAL && !magnet) return addTrainingProgress(p, 1);
          if (id === 'MAGNET' && agent === 'human' && currentMode === AppMode.MANUAL && magnet) return addTrainingProgress(p, 1);
          if (id === 'TEAMING' && agent === 'human' && currentMode === AppMode.TEAMING) return addTrainingProgress(p, 1);
          if (id === 'AUTONOMY' && agent === 'ai' && currentMode === AppMode.AI_AUTONOMY) return addTrainingProgress(p, 1);
        } else if (reason === 'wrong' && id === 'TEAMING') {
          return addTrainingError(p);
        }
        return p;
      });
      if (type === 'miss' && reason === 'wrong') addSystemLog('TRAINING: Incorrect verification (Q = odd, W = even)', 'warning');
      return;
    }

    if (phaseRef.current !== 'MISSION') return;

    setStats(prev => {
      const s = { ...prev };
      if (type === 'hit') {
        if (agent === 'human') {
          if (currentMode === AppMode.TEAMING) s.teamingHits++;
          else s.humanHits++;
        } else s.aiHits++;
      } else if (agent === 'human') {
        if (currentMode === AppMode.TEAMING) s.teamingMisses++;
        else s.humanMisses++;
      } else s.aiMisses++;
      return s;
    });

    if (type === 'hit') {
      if (agent === 'ai') {
        if (neutralizationTime) {
          analyticsRef.current.rtNeutralizationAi.push(neutralizationTime);
          logEvent('HIT', 'AI', `Neutralized in ${neutralizationTime.toFixed(0)}ms`);
        } else {
          logEvent('HIT', 'AI', 'Neutralized');
        }
      } else if (currentMode === AppMode.MANUAL) {
        if (detectionTime) analyticsRef.current.rtDetectionManual.push(detectionTime);
        if (neutralizationTime) analyticsRef.current.rtNeutralizationManual.push(neutralizationTime);
        logEvent('HIT', 'HUMAN', `Manual: Detect ${detectionTime?.toFixed(0)}ms / Neut ${neutralizationTime?.toFixed(0)}ms`);
      } else if (currentMode === AppMode.TEAMING) {
        if (neutralizationTime) analyticsRef.current.rtNeutralizationTeaming.push(neutralizationTime);
        logEvent('HIT', 'HUMAN', `Teaming: Cognitive Reaction ${neutralizationTime?.toFixed(0)}ms`);
      }
    } else {
      logEvent('MISS', agent === 'human' ? 'HUMAN' : 'AI', reason === 'wrong' ? 'Incorrect Verification' : 'Target Missed/Expired');
    }
  }, [logEvent, addSystemLog]);

  // ---------------- KEYBOARD ----------------
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'TRAINING' && phase !== 'MISSION') return;
      if (isTypingTarget(e.target)) return;

      if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        if (!showReport && !trainingFinished) setShowHelp(prev => !prev);
        return;
      }
      if (showReport || trainingFinished || countdownActive) return;

      if (e.key === 'Escape') {
        if (showHelp) return; // Tutorial modal closes itself in help mode
        setIsPaused(prev => {
          addSystemLog(!prev ? 'System Paused' : 'System Resumed', 'info');
          return !prev;
        });
        return;
      }

      if (isPaused || showHelp) return;
      const key = e.key.toLowerCase();

      if (['1', '2', '3', '4', '5'].includes(key)) {
        const count = parseInt(key, 10);
        setGameConfig(prev => ({ ...prev, aiAgentCount: count }));
        showToast(`AI AGENTS SET TO ${count}`, 'text-cyan-400');
        logEvent('MODE_CHANGE', 'HUMAN', `AI Agents set to ${count}`);
        addSystemLog(`CONFIG: AI Agent count updated to ${count}`, 'info');
      }
      if (key === 'n' && mode === AppMode.MANUAL) toggleMagnet();
      if (key === 'm') {
        manualForceSwitch();
        showToast('MANUAL CONTROL TAKEN', 'text-blue-500');
      }
      if (key === 'a') {
        autoForceSwitch();
        showToast('DELEGATING TO AUTONOMY', 'text-red-500');
      }
      if (key === 't') {
        switchToTeaming();
        showToast('TEAMING: AI LOCKS > [Q] ODD / [W] EVEN', 'text-yellow-500');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [phase, isPaused, showHelp, showReport, trainingFinished, countdownActive, mode, manualForceSwitch, autoForceSwitch,
    switchToTeaming, toggleMagnet, logEvent, addSystemLog, showToast]);

  // ---------------- REPORTS ----------------
  const handleFinishSession = () => {
    setIsPaused(true);
    setSessionEndTime(Date.now());
    logEvent('SESSION_END', 'SYSTEM', 'User ended session');
    setShowReport(true);
  };

  const fileStem = () => `sentinel${operatorId ? `_${operatorId}` : ''}_${Date.now()}`;

  const generateReport = () => {
    const a = analyticsRef.current;
    const end = sessionEndTime ?? Date.now();
    const duration = (end - a.startTime) / 1000;
    const t = trainingSummaryRef.current;
    const lines = [
      'SENTINELTRACK AI - MISSION REPORT',
      '==================================',
      `Operator ID:       ${operatorId || 'N/A'}`,
      `Date:              ${new Date(a.startTime).toLocaleString()}`,
      `Session Duration:  ${duration.toFixed(1)} s`,
      '',
      'PERFORMANCE BY MODE',
      '-------------------',
      `Manual:    ${stats.humanHits} hit / ${stats.humanMisses} miss  (${getRatio(stats.humanHits, stats.humanMisses)}% accuracy)`,
      `Teaming:   ${stats.teamingHits} correct / ${stats.teamingMisses} error  (${getRatio(stats.teamingHits, stats.teamingMisses)}% precision)`,
      `Autonomy:  ${stats.aiHits} hit / ${stats.aiMisses} miss  (${getRatio(stats.aiHits, stats.aiMisses)}% accuracy)`,
      '',
      'RESPONSE LATENCY (AVERAGE)',
      '--------------------------',
      `Operator detection (dwell):     ${calculateAverage(a.rtDetectionManual)} ms  (n=${a.rtDetectionManual.length})`,
      `Operator neutralisation:        ${calculateAverage(a.rtNeutralizationManual)} ms  (n=${a.rtNeutralizationManual.length})`,
      `Teaming cognitive response:     ${calculateAverage(a.rtNeutralizationTeaming)} ms  (n=${a.rtNeutralizationTeaming.length})`,
      `Autonomous neutralisation:      ${calculateAverage(a.rtNeutralizationAi)} ms  (n=${a.rtNeutralizationAi.length})`,
      '',
      'SENSOR INTEGRITY',
      '----------------',
      `Out-of-bounds events:  ${a.outOfBoundsCount}`,
      `Distraction events:    ${a.distractionCount}`,
      `Mode changes:          ${a.events.filter(e => e.eventType === 'MODE_CHANGE').length}`,
      '',
      'TRAINING',
      '--------',
      ...(t
        ? t.results.map((r, i) => `${TRAINING_DRILLS[i].title.padEnd(24)} ${r.status.toUpperCase().padEnd(9)} ${drillDurationSec(r)}s  ${r.errors} errors`)
        : ['Training phase not completed in this session.']),
      '',
      `Generated ${new Date().toLocaleString()}`,
    ];
    downloadBlob(lines.join('\n'), 'text/plain', `${fileStem()}_report.txt`);
  };

  const generateCSV = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const header = 'OperatorId,Timestamp,RelativeTimeMs,EventType,Agent,Details\n';
    const rows = analyticsRef.current.events.map(e =>
      [esc(operatorId || ''), e.timestamp, e.relativeTime, e.eventType, e.agent, esc(e.details)].join(','),
    );
    downloadBlob(header + rows.join('\n'), 'text/csv', `${fileStem()}_events.csv`);
  };

  // ---------------- RENDER ----------------
  const inField = phase === 'TRAINING' || phase === 'MISSION';
  const showMissionAlerts = phase === 'MISSION' && !simPaused;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none z-[5] scanline opacity-30 mix-blend-overlay" />
      {showMissionAlerts && trackerStatus === 'DISTRACTED' && (
        <div className="absolute inset-0 pointer-events-none z-[6] border-[16px] border-yellow-500/50 transition-all" />
      )}

      {showMissionAlerts && trackerStatus === 'DISTRACTED' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-900/80 text-yellow-100 px-6 py-2 rounded-full font-bold animate-pulse z-50 pointer-events-none flex items-center gap-2 border border-yellow-500">
          <ScanEye size={20} /> ATTENTION REQUIRED
        </div>
      )}
      {showMissionAlerts && trackerStatus === 'OUT_OF_BOUNDS' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-2 rounded-full font-bold animate-bounce z-50 pointer-events-none flex items-center gap-2 border border-red-500">
          <ShieldAlert size={20} /> SENSOR LOSS - AUTONOMY ACTIVE
        </div>
      )}

      {phase === 'INTRO' && (
        <IntroScreen
          operatorId={operatorId}
          onOperatorIdChange={setOperatorId}
          onStartTutorial={startTutorial}
          onStartTraining={startTraining}
          onStartMission={startMission}
        />
      )}

      {phase === 'TUTORIAL' && <TutorialModal mode="intro" onClose={startTraining} onSkipToMission={startMission} />}
      {showHelp && inField && <TutorialModal mode="help" onClose={() => setShowHelp(false)} />}

      {trainingFinished && training && (
        <TrainingComplete training={training} onBeginMission={startMission} onRepeatTraining={startTraining} />
      )}

      {phase === 'MISSION' && countdownActive && <MissionCountdown seconds={3} onDone={endCountdown} />}

      {showReport && (
        <ReportModal
          stats={stats}
          analytics={analyticsRef.current}
          operatorId={operatorId}
          endTime={sessionEndTime ?? Date.now()}
          training={trainingSummaryRef.current}
          onClose={() => setShowReport(false)}
          onDownloadTxt={generateReport}
          onDownloadCsv={generateCSV}
          onRestart={restartMission}
        />
      )}

      {isPaused && inField && !showHelp && !showReport && (
        <div className="absolute inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
            <div className="mb-6 flex justify-center">
              <div className="bg-blue-500/10 p-4 rounded-full border border-blue-500/30">
                <Pause size={32} className="text-blue-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{phase === 'TRAINING' ? 'Training Paused' : 'Mission Paused'}</h2>
            <p className="text-slate-400 mb-8 text-sm">Simulation suspended.</p>
            <div className="space-y-3">
              <button
                onClick={() => { setIsPaused(false); addSystemLog('System Resumed', 'info'); }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Play size={18} fill="currentColor" /> RESUME
              </button>
              {phase === 'TRAINING' ? (
                <>
                  <button
                    onClick={startTraining}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700 hover:text-white"
                  >
                    <RotateCcw size={18} /> RESTART TRAINING
                  </button>
                  <button
                    onClick={startMission}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-green-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                  >
                    <Rocket size={18} /> SKIP TO MISSION
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={restartMission}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700 hover:text-white"
                  >
                    <RotateCcw size={18} /> RESTART MISSION
                  </button>
                  <button
                    onClick={startTraining}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                  >
                    <GraduationCap size={18} /> REPLAY TRAINING
                  </button>
                  <hr className="border-slate-800 my-4" />
                  <button
                    onClick={handleFinishSession}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-green-400 hover:text-green-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} /> COMPLETE & VIEW REPORT
                  </button>
                </>
              )}
              <button
                onClick={returnToIntro}
                className="w-full text-slate-500 hover:text-slate-300 py-2 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Home size={14} /> RETURN TO BRIEFING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Overlay HUD */}
      {inField && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10 gap-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div
              className={`text-[10px] font-bold tracking-[0.2em] px-3 py-2 rounded-full border ${
                phase === 'TRAINING' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-blue-300 border-blue-500/40 bg-blue-500/10'
              }`}
              data-testid="phase-badge"
            >
              {phase === 'TRAINING' ? 'TRAINING' : 'LIVE MISSION'}
            </div>

            <div className="flex items-center gap-3 bg-slate-900/50 backdrop-blur rounded-full px-4 py-2 border border-slate-700 shadow-xl" data-testid="mode-indicator">
              {mode === AppMode.AI_AUTONOMY ? (
                <>
                  <Bot className="text-red-500 animate-pulse" />
                  <span className="font-bold text-red-500 tracking-widest">{isAiOverride ? 'AI AUTONOMY (OVERRIDE)' : 'AI AUTONOMY ACTIVE'}</span>
                </>
              ) : mode === AppMode.TEAMING ? (
                <>
                  <Users className="text-yellow-500" />
                  <span className="font-bold text-yellow-500 tracking-widest">TEAMING MODE</span>
                </>
              ) : mode === AppMode.TRANSITION_RECOVERY ? (
                <>
                  <ScanEye className="text-yellow-500 animate-pulse" />
                  <span className="font-bold text-yellow-500 tracking-widest">HANDSHAKE PROTOCOL</span>
                </>
              ) : (
                <>
                  <MousePointer2 className="text-blue-500" />
                  <span className="font-bold text-blue-500 tracking-widest">MANUAL CONTROL</span>
                </>
              )}
            </div>

            <div className="flex gap-2 pointer-events-auto items-center">
              {mode === AppMode.MANUAL && (
                <button
                  onClick={() => toggleMagnet()}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-full border border-slate-700 transition-colors shadow-lg group"
                  title="Magnet Assist (N)"
                  aria-pressed={gameConfig.magnetAssist}
                >
                  <Magnet size={14} className={gameConfig.magnetAssist ? 'text-cyan-400' : 'text-slate-500'} />
                  <span className={`text-xs font-bold ${gameConfig.magnetAssist ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>MAGNET</span>
                </button>
              )}
              {mode !== AppMode.MANUAL && (
                <button
                  onClick={manualForceSwitch}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white px-3 py-2 rounded-full font-bold text-xs border border-slate-700 shadow-lg transition-all"
                  title="Manual Control (M)"
                >
                  <MousePointer2 size={14} /> MANUAL
                </button>
              )}
              {mode !== AppMode.TEAMING && (
                <button
                  onClick={switchToTeaming}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-yellow-600 text-slate-300 hover:text-white px-3 py-2 rounded-full font-bold text-xs border border-slate-700 shadow-lg transition-all"
                  title="Teaming Mode (T)"
                >
                  <Users size={14} /> TEAMING
                </button>
              )}
              {mode !== AppMode.AI_AUTONOMY && (
                <button
                  onClick={autoForceSwitch}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white px-3 py-2 rounded-full font-bold text-xs border border-slate-700 shadow-lg transition-all"
                  title="Delegate to AI (A)"
                >
                  <Bot size={14} /> AUTO
                </button>
              )}

              <div className="w-px h-6 bg-slate-700 mx-1" />

              {phase === 'MISSION' && (
                <button
                  onClick={handleFinishSession}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 border border-slate-700 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 transition-colors shadow-lg"
                  title="Finish Session / View Report"
                >
                  <CheckCircle size={14} />
                  <span className="text-xs font-bold">FINISH</span>
                </button>
              )}
              <button
                onClick={() => setIsPaused(true)}
                className="p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
                title="Pause (Esc)"
                aria-label="Pause"
              >
                <Pause size={18} />
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
                title="Help / Documentation (H)"
                aria-label="Help"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {mode === AppMode.TEAMING && (
              <div className="flex gap-4 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded border border-yellow-500/30">
                <span>[Q] ODD | [W] EVEN</span>
              </div>
            )}
          </div>

          {phase === 'TRAINING' && training && !training.finished && (
            <TrainingCoach
              training={training}
              mode={mode}
              magnetAssist={gameConfig.magnetAssist}
              trackerStatus={trackerStatus}
              onSkipDrill={skipDrill}
              onExitTraining={endTraining}
              onBypassSensors={() => setBypassSignal(s => s + 1)}
            />
          )}

          {phase === 'MISSION' && (
            <div className="flex gap-4 shrink-0">
              <div className={`bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex gap-6 transition-opacity duration-300 ${mode === AppMode.TEAMING ? 'opacity-50' : 'opacity-100'}`}>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1 flex justify-between gap-4">
                    <span>OPERATOR</span>
                    <span className={`font-mono ${getRatio(stats.humanHits, stats.humanMisses) >= 80 ? 'text-blue-400' : 'text-slate-500'}`}>
                      {getRatio(stats.humanHits, stats.humanMisses)}%
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div><span className="text-green-500 font-bold">{stats.humanHits}</span> <span className="text-slate-500 text-[10px] font-bold">HIT</span></div>
                    <div><span className="text-red-500 font-bold">{stats.humanMisses}</span> <span className="text-slate-500 text-[10px] font-bold">MISS</span></div>
                  </div>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] font-bold uppercase mb-1 flex justify-between gap-4">
                    <span>SENTINEL</span>
                    <span className={`font-mono ${getRatio(stats.aiHits, stats.aiMisses) >= 80 ? 'text-red-400' : 'text-slate-500'}`}>
                      {getRatio(stats.aiHits, stats.aiMisses)}%
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div><span className="text-green-500 font-bold">{stats.aiHits}</span> <span className="text-slate-500 text-[10px] font-bold">HIT</span></div>
                    <div><span className="text-red-500 font-bold">{stats.aiMisses}</span> <span className="text-slate-500 text-[10px] font-bold">MISS</span></div>
                  </div>
                </div>
              </div>

              {mode === AppMode.TEAMING && (
                <div className="bg-yellow-900/40 backdrop-blur border border-yellow-500/50 rounded-lg p-3 animate-in fade-in slide-in-from-right-4 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  <div className="text-yellow-500 text-[10px] font-bold uppercase mb-2 flex justify-between items-center border-b border-yellow-500/20 pb-1">
                    <span>COGNITIVE LOAD TASK</span>
                    <Trophy size={12} className="text-yellow-400" />
                  </div>
                  <div className="flex gap-6 text-sm text-yellow-100 items-end">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-2xl text-yellow-400 drop-shadow-sm">{stats.teamingHits}</span>
                      <span className="text-[9px] text-yellow-500/70 uppercase font-bold tracking-wider">CORRECT</span>
                    </div>
                    <div className="w-px h-8 bg-yellow-500/30" />
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-2xl text-red-400 drop-shadow-sm">{stats.teamingMisses}</span>
                      <span className="text-[9px] text-yellow-500/70 uppercase font-bold tracking-wider">ERROR</span>
                    </div>
                    <div className="w-px h-8 bg-yellow-500/30" />
                    <div className="flex flex-col items-center">
                      <span className={`font-bold text-2xl drop-shadow-sm ${getRatio(stats.teamingHits, stats.teamingMisses) >= 50 ? 'text-green-400' : 'text-orange-400'}`}>
                        {getRatio(stats.teamingHits, stats.teamingMisses)}%
                      </span>
                      <span className="text-[9px] text-yellow-500/70 uppercase font-bold tracking-wider">Precision</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <SimulationCanvas
        key={sessionId}
        mode={mode}
        config={effectiveConfig}
        onStatUpdate={handleStatUpdate}
        width={viewport.width}
        height={viewport.height}
        paused={simPaused}
      />

      {mode === AppMode.TRANSITION_RECOVERY && inField && !simPaused && (
        <RecoveryModal onConfirm={confirmControl} onReject={rejectControl} onTeaming={switchToTeaming} />
      )}

      {inField && !showReport && <SystemLog logs={systemLogs} />}

      <div className={`absolute bottom-4 right-4 w-48 h-36 z-20 pointer-events-none ${inField ? '' : 'opacity-0'}`}>
        <div className="pointer-events-auto h-full shadow-2xl rounded-lg overflow-hidden border border-slate-700">
          <WebcamTracker
            active={phase !== 'INTRO'}
            onFaceDetected={handleFaceUpdate}
            onStatusChange={handleTrackerStatusChange}
            onTrackingError={handleTrackingError}
            config={gameConfig}
            bypassSignal={bypassSignal}
          />
        </div>
      </div>

      {inField && <DebugPanel config={gameConfig} setConfig={setGameConfig} currentMode={mode} setMode={setMode} />}

      {gestureToast && !simPaused && (
        <div
          key={gestureToast.id}
          className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-50 pointer-events-none"
        >
          {gestureToast.msg.includes('MANUAL') && <MousePointer2 className={gestureToast.type} />}
          {gestureToast.msg.includes('AUTONOMY') && <Bot className={gestureToast.type} />}
          {gestureToast.msg.includes('TEAMING') && <Users className={gestureToast.type} />}
          {gestureToast.msg.includes('AGENTS') && <Bot className={gestureToast.type} />}
          {gestureToast.msg.includes('MAGNET') && <Magnet className={gestureToast.type} />}
          <span className={`font-bold tracking-widest ${gestureToast.type}`}>{gestureToast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
