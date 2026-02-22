import { LINE_SCORES, SOFT_DROP_SCORE, HARD_DROP_SCORE, LINES_PER_LEVEL, GRAVITY_MS, GRAVITY_MIN_MS } from './constants.ts';

export function calculateLineScore(linesCleared: number, level: number): number {
  return (LINE_SCORES[linesCleared] ?? 0) * level;
}

export function calculateSoftDropScore(cells: number): number {
  return cells * SOFT_DROP_SCORE;
}

export function calculateHardDropScore(cells: number): number {
  return cells * HARD_DROP_SCORE;
}

export function calculateLevel(totalLines: number): number {
  return Math.floor(totalLines / LINES_PER_LEVEL) + 1;
}

export function getGravityMs(level: number): number {
  const idx = Math.min(level - 1, GRAVITY_MS.length - 1);
  return GRAVITY_MS[idx] ?? GRAVITY_MIN_MS;
}
