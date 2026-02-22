export const COLS = 10;
export const ROWS = 20;
export const CELL_SIZE = 32;
export const PREVIEW_CELL_SIZE = 28;
export const PREVIEW_CANVAS_SIZE = 4 * PREVIEW_CELL_SIZE; // 112px

export const COLORS: readonly string[] = [
  'transparent', // 0 - empty
  '#00e5ff',     // 1 - I  - cyan
  '#ffd600',     // 2 - O  - yellow
  '#aa00ff',     // 3 - T  - purple
  '#00e676',     // 4 - S  - green
  '#ff1744',     // 5 - Z  - red
  '#2979ff',     // 6 - J  - blue
  '#ff6d00',     // 7 - L  - orange
];

export const GHOST_ALPHA = 0.25;
export const CELL_GLOW = 10;

// Gravity: ms per automatic drop, indexed by level - 1 (capped at index 14)
export const GRAVITY_MS: readonly number[] = [
  1000, 900, 800, 700, 600, 500, 400, 300, 250, 200,
  150, 120, 100, 90, 80,
];
export const GRAVITY_MIN_MS = 80;

export const LOCK_DELAY_MS = 500;
export const LOCK_DELAY_MAX_RESETS = 15;

export const DAS_DELAY_MS = 170;
export const ARR_INTERVAL_MS = 50;

export const LINE_SCORES: readonly number[] = [0, 100, 300, 500, 800];
export const SOFT_DROP_SCORE = 1;  // per cell
export const HARD_DROP_SCORE = 2;  // per cell

export const LINES_PER_LEVEL = 10;
