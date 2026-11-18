export enum EntityType {
  TARGET_PRIMARY = 'TARGET_PRIMARY', // Blue Circle
  DISTRACTOR_A = 'DISTRACTOR_A', // White
  DISTRACTOR_B = 'DISTRACTOR_B', // Yellow
  DISTRACTOR_C = 'DISTRACTOR_C', // Green
}

export enum EntityState {
  SPAWNING = 'SPAWNING', // Waiting to enter screen
  IDLE = 'IDLE',
  DWELLING = 'DWELLING',
  LOCKED = 'LOCKED', // Ready to click
}

export interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  state: EntityState;
  dwellProgress: number; // 0 to 1
  lifespan: number; // Remaining time in ms
  maxLifespan: number; // Total time for opacity calc
  spawnDelay: number; // Time until it appears
  verificationNumber: number | null; // For Teaming mode cognitive task
  feedback: 'CORRECT' | 'ERROR' | null; // Visual feedback state
  feedbackTimer: number; // Timer for feedback animation
  
  // Analytics Timestamps
  timestampSpawn: number;
  timestampLock: number | null;
}

export enum AppMode {
  MANUAL = 'MANUAL', // User controls mouse
  AI_AUTONOMY = 'AI_AUTONOMY', // AI controls cursor + Auto Fire
  TEAMING = 'TEAMING', // AI controls cursor + Human Fire
  TRANSITION_RECOVERY = 'TRANSITION_RECOVERY', // Countdown to return to manual
}

export interface Point {
  x: number;
  y: number;
}

export interface GameStats {
  humanHits: number;
  humanMisses: number;
  teamingHits: number;
  teamingMisses: number;
  aiHits: number;
  aiMisses: number;
}

export interface AnalyticsEvent {
    timestamp: number; // Unix timestamp
    relativeTime: number; // ms since session start
    eventType: 'SESSION_START' | 'SESSION_END' | 'MODE_CHANGE' | 'HIT' | 'MISS' | 'ERROR_BOUNDS' | 'ERROR_DISTRACTION' | 'TRAINING';
    agent: 'HUMAN' | 'AI' | 'SYSTEM';
    details: string; // e.g., "ReactionTime: 400ms" or "Mode: TEAMING"
}

export interface SessionAnalytics {
  startTime: number;
  totalSessionTime: number; // ms
  
  // Event Log (For CSV)
  events: AnalyticsEvent[];

  // Counters (For Summary)
  outOfBoundsCount: number;
  distractionCount: number;

  // Reaction Times (Arrays of ms to calculate average later)
  rtDetectionManual: number[];
  rtNeutralizationManual: number[];
  rtNeutralizationAi: number[];
  rtNeutralizationTeaming: number[];
}

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface AudioConfig {
  enabled: boolean;
  frequency: number; // Hz
  type: OscillatorType;
  loop: boolean; // Continuous alarm vs Single burst
}

export interface GameConfig {
  // Tracker Settings
  safeZoneScale: number; // 0.1 to 1.0
  faceConfidenceThreshold: number; // 0.1 to 0.9
  showDebugOverlay: boolean;
  showCameraFeed: boolean; // Toggle camera visibility
  enableAttentionCheck: boolean; // Toggle eye/gaze tracking
  attentionSensitivity: number; // 0.1 (strict) to 1.0 (loose) - Yaw threshold

  // Gameplay Settings
  entityCount: number;
  aiAgentCount: number; // Number of AI cursors
  minLifespan: number;
  maxLifespan: number;
  spawnInterval: number; // Delay between respawns
  aiTargetColor: string; // Color of the target AI is locked onto
  teamingCrosshairColor: string; // Color of the user selection crosshair in Teaming mode
  magnetAssist: boolean; // Snap to target in Manual mode
  
  // Protocol Settings
  handshakeOnDistraction: boolean; // If true, distraction triggers full Autonomy switch + Handshake return. If false, just visual warning.
  
  // Audio Settings
  audio: AudioConfig;
}

// ---------------- APPLICATION FLOW ----------------

/** Top-level flow: briefing -> tutorial -> guided training -> live mission. */
export type AppPhase = 'INTRO' | 'TUTORIAL' | 'TRAINING' | 'MISSION';

export type TrainingDrillId = 'SENSOR' | 'MANUAL' | 'MAGNET' | 'TEAMING' | 'AUTONOMY' | 'HANDSHAKE';

export interface TrainingDrill {
  id: TrainingDrillId;
  title: string;
  objective: string;
  instructions: string[];
  target: number;
  unit: string;
  keys: string[];
}

export type DrillStatus = 'pending' | 'active' | 'complete' | 'skipped';

export interface DrillResult {
  id: TrainingDrillId;
  status: DrillStatus;
  startedAt: number | null;
  completedAt: number | null;
  errors: number;
}

export interface TrainingState {
  index: number;
  progress: number;
  results: DrillResult[];
  justCompleted: boolean;
  finished: boolean;
}
