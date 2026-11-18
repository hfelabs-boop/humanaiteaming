import { DrillResult, TrainingDrill, TrainingState } from './types';

/**
 * Guided training curriculum. Each drill runs on the live simulation canvas with a
 * reduced target density and longer target lifespans. Progress is counted only when
 * the operator performs the action in the mode the drill is teaching.
 */
export const TRAINING_DRILLS: TrainingDrill[] = [
  {
    id: 'SENSOR',
    title: 'Sensor Calibration',
    objective: 'Hold a steady sensor lock for 2 seconds.',
    instructions: [
      'Sit centred in front of the camera so your face is inside the dashed safe zone (bottom-right panel).',
      'Look straight at the screen — the panel turns green and reads TRACKING.',
      'No camera? Bypass the sensors. The failsafe is then disabled for the session.',
    ],
    target: 2,
    unit: 's locked',
    keys: [],
  },
  {
    id: 'MANUAL',
    title: 'Manual Engagement',
    objective: 'Neutralise 3 blue targets by hand.',
    instructions: [
      'Hover your cursor over a BLUE target and hold still — the dwell ring fills.',
      'When it reads DETECTED, click to neutralise.',
      'Ignore white, yellow and green distractors.',
    ],
    target: 3,
    unit: 'targets',
    keys: ['M'],
  },
  {
    id: 'MAGNET',
    title: 'Magnet Assist',
    objective: 'Engage magnet assist and neutralise 2 targets.',
    instructions: [
      'Press N (or the MAGNET chip) to engage cursor snap.',
      'Move near a blue target — the cyan cursor snaps onto it.',
      'Dwell, then click as before.',
    ],
    target: 2,
    unit: 'targets',
    keys: ['N'],
  },
  {
    id: 'TEAMING',
    title: 'Teaming Protocol',
    objective: 'Correctly verify 5 targets locked by the AI.',
    instructions: [
      'Press T to enter Teaming mode. The magenta SENTINEL scanner acquires targets for you.',
      'The target under the rotating yellow crosshair shows a number.',
      'Press Q if the number is ODD, W if it is EVEN.',
    ],
    target: 5,
    unit: 'verified',
    keys: ['T', 'Q', 'W'],
  },
  {
    id: 'AUTONOMY',
    title: 'Autonomous Delegation',
    objective: 'Delegate to the AI and watch it neutralise 3 targets.',
    instructions: [
      'Press A to hand full control to the autonomous agent.',
      'Red AI cursors hunt, lock and fire on targets without your input.',
      'Use keys 1–5 to change how many AI agents are deployed.',
    ],
    target: 3,
    unit: 'AI kills',
    keys: ['A', '1–5'],
  },
  {
    id: 'HANDSHAKE',
    title: 'Handshake Recovery',
    objective: 'Reclaim control through the handshake protocol.',
    instructions: [
      'A sensor loss is simulated — the AI assumes control.',
      'When you are re-detected, the HANDSHAKE panel appears with a 5 s countdown.',
      'Choose TAKE MANUAL CONTROL or INITIATE TEAMING MODE.',
    ],
    target: 1,
    unit: 'handover',
    keys: [],
  },
];

/** Training uses an easier field so operators can focus on the controls. */
export const TRAINING_FIELD = {
  entityCount: 10,
  minLifespan: 6000,
  maxLifespan: 11000,
};

export const createTrainingState = (): TrainingState => ({
  index: 0,
  progress: 0,
  justCompleted: false,
  finished: false,
  results: TRAINING_DRILLS.map((d, i): DrillResult => ({
    id: d.id,
    status: i === 0 ? 'active' : 'pending',
    startedAt: i === 0 ? Date.now() : null,
    completedAt: null,
    errors: 0,
  })),
});

/** Moves the curriculum to the next drill (or marks training finished). */
export const advanceTraining = (prev: TrainingState): TrainingState => {
  const nextIndex = prev.index + 1;
  if (nextIndex >= TRAINING_DRILLS.length) {
    return { ...prev, justCompleted: false, finished: true };
  }
  const results = prev.results.map((r, i) =>
    i === nextIndex ? { ...r, status: 'active' as const, startedAt: Date.now() } : r,
  );
  return { ...prev, index: nextIndex, progress: 0, justCompleted: false, results };
};

/** Adds progress to the active drill and flags completion when the target is reached. */
export const addTrainingProgress = (prev: TrainingState, amount: number, absolute = false): TrainingState => {
  if (prev.finished || prev.justCompleted) return prev;
  const drill = TRAINING_DRILLS[prev.index];
  const progress = Math.min(drill.target, absolute ? amount : prev.progress + amount);
  if (progress >= drill.target) {
    const results = prev.results.map((r, i) =>
      i === prev.index ? { ...r, status: 'complete' as const, completedAt: Date.now() } : r,
    );
    return { ...prev, progress, justCompleted: true, results };
  }
  return { ...prev, progress };
};

export const skipTrainingDrill = (prev: TrainingState): TrainingState => {
  if (prev.finished || prev.justCompleted) return prev;
  const results = prev.results.map((r, i) =>
    i === prev.index ? { ...r, status: 'skipped' as const, completedAt: Date.now() } : r,
  );
  return advanceTraining({ ...prev, results });
};

export const addTrainingError = (prev: TrainingState): TrainingState => {
  if (prev.finished) return prev;
  const results = prev.results.map((r, i) => (i === prev.index ? { ...r, errors: r.errors + 1 } : r));
  return { ...prev, results };
};

export const drillDurationSec = (r: DrillResult): string =>
  r.startedAt && r.completedAt ? ((r.completedAt - r.startedAt) / 1000).toFixed(1) : '—';
