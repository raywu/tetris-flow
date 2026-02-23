import { describe, it, expect } from 'vitest';
import {
  calculateLineScore,
  calculateLevel,
  getGravityMs,
  calculateSoftDropScore,
  calculateHardDropScore,
} from './scoring.ts';
import { GRAVITY_MIN_MS } from './constants.ts';

describe('calculateLineScore', () => {
  it('returns 0 for 0 lines cleared', () => {
    expect(calculateLineScore(0, 1)).toBe(0);
  });

  it('returns 100 for 1 line at level 1', () => {
    expect(calculateLineScore(1, 1)).toBe(100);
  });

  it('returns 300 for 2 lines at level 1', () => {
    expect(calculateLineScore(2, 1)).toBe(300);
  });

  it('returns 500 for 3 lines at level 1', () => {
    expect(calculateLineScore(3, 1)).toBe(500);
  });

  it('returns 800 for Tetris (4 lines) at level 1', () => {
    expect(calculateLineScore(4, 1)).toBe(800);
  });

  it('scales Tetris by level — level 5 gives 4000', () => {
    expect(calculateLineScore(4, 5)).toBe(4000);
  });

  it('scales single line by level — level 5 gives 500', () => {
    expect(calculateLineScore(1, 5)).toBe(500);
  });
});

describe('calculateLevel', () => {
  it('returns 1 for 0 lines', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns 1 for 9 lines', () => {
    expect(calculateLevel(9)).toBe(1);
  });

  it('returns 2 for 10 lines', () => {
    expect(calculateLevel(10)).toBe(2);
  });

  it('returns 10 for 99 lines', () => {
    expect(calculateLevel(99)).toBe(10);
  });

  it('returns 11 for 100 lines', () => {
    expect(calculateLevel(100)).toBe(11);
  });
});

describe('getGravityMs', () => {
  it('level 1 is slower than level 5 (monotone decrease)', () => {
    expect(getGravityMs(1)).toBeGreaterThan(getGravityMs(5));
  });

  it('level 5 is slower than level 10', () => {
    expect(getGravityMs(5)).toBeGreaterThan(getGravityMs(10));
  });

  it('caps at GRAVITY_MIN_MS for level 15', () => {
    expect(getGravityMs(15)).toBe(GRAVITY_MIN_MS);
  });

  it('caps at GRAVITY_MIN_MS for level 100', () => {
    expect(getGravityMs(100)).toBe(GRAVITY_MIN_MS);
  });
});

describe('calculateSoftDropScore', () => {
  it('returns cells × 1', () => {
    expect(calculateSoftDropScore(5)).toBe(5);
    expect(calculateSoftDropScore(0)).toBe(0);
    expect(calculateSoftDropScore(1)).toBe(1);
  });
});

describe('calculateHardDropScore', () => {
  it('returns cells × 2', () => {
    expect(calculateHardDropScore(5)).toBe(10);
    expect(calculateHardDropScore(0)).toBe(0);
    expect(calculateHardDropScore(1)).toBe(2);
  });
});
