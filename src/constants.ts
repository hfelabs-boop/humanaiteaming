
import { EntityType } from './types';

export const COLORS = {
  [EntityType.TARGET_PRIMARY]: '#3b82f6', // Blue-500
  [EntityType.DISTRACTOR_A]: '#f8fafc', // Slate-50, White-ish
  [EntityType.DISTRACTOR_B]: '#eab308', // Yellow-500
  [EntityType.DISTRACTOR_C]: '#22c55e', // Green-500
  AI_CURSOR: '#ef4444', // Red-500
  HUD_BG: 'rgba(15, 23, 42, 0.8)',
};

export const CONFIG = {
  DWELL_TIME_MS: 1000,
  ENTITY_RADIUS: 20,
  ENTITY_COUNT: 18,
  SPEED_MIN: 0.5,
  SPEED_MAX: 2.5,
  AI_CURSOR_SPEED: 0.08, // Lerp factor
  RECOVERY_TIME_SEC: 5,
  LIFESPAN_MIN_MS: 3000,
  LIFESPAN_MAX_MS: 8000,
  MAGNET_RADIUS: 80, // Pixel radius for magnet snap
};
