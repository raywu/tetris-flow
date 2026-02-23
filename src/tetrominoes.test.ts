import { describe, it, expect } from 'vitest';
import { TETROMINO_IDS, getTetromino, getCells } from './tetrominoes.ts';
import type { ActivePiece } from './types.ts';

describe('TETROMINO_IDS', () => {
  it('contains exactly 7 entries', () => {
    expect(TETROMINO_IDS).toHaveLength(7);
  });

  it('contains all standard tetromino IDs', () => {
    const ids = new Set(TETROMINO_IDS);
    for (const id of ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const) {
      expect(ids.has(id)).toBe(true);
    }
  });
});

describe('getTetromino', () => {
  it('each tetromino has exactly 4 rotation entries', () => {
    for (const id of TETROMINO_IDS) {
      expect(getTetromino(id).rotations).toHaveLength(4);
    }
  });

  it('each rotation contains exactly 4 cells', () => {
    for (const id of TETROMINO_IDS) {
      for (const rotation of getTetromino(id).rotations) {
        expect(rotation).toHaveLength(4);
      }
    }
  });
});

describe('getCells', () => {
  it('I-piece at (0,0) rotation 0 returns correct absolute coords', () => {
    const piece: ActivePiece = { def: getTetromino('I'), rotation: 0, pos: { x: 0, y: 0 } };
    const cells = getCells(piece);
    // I rot-0: [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1}] + pos (0,0)
    expect(cells).toHaveLength(4);
    expect(cells).toContainEqual({ x: 0, y: 1 });
    expect(cells).toContainEqual({ x: 1, y: 1 });
    expect(cells).toContainEqual({ x: 2, y: 1 });
    expect(cells).toContainEqual({ x: 3, y: 1 });
  });

  it('T-piece at (0,0) rotation 0 returns correct absolute coords', () => {
    const piece: ActivePiece = { def: getTetromino('T'), rotation: 0, pos: { x: 0, y: 0 } };
    const cells = getCells(piece);
    // T rot-0: [{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}]
    expect(cells).toContainEqual({ x: 1, y: 0 });
    expect(cells).toContainEqual({ x: 0, y: 1 });
    expect(cells).toContainEqual({ x: 1, y: 1 });
    expect(cells).toContainEqual({ x: 2, y: 1 });
  });

  it('cells are offset by piece position', () => {
    const piece: ActivePiece = { def: getTetromino('O'), rotation: 0, pos: { x: 3, y: 5 } };
    const cells = getCells(piece);
    // O rot-0: [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:2,y:1}] + pos (3,5)
    expect(cells).toContainEqual({ x: 4, y: 5 });
    expect(cells).toContainEqual({ x: 5, y: 5 });
    expect(cells).toContainEqual({ x: 4, y: 6 });
    expect(cells).toContainEqual({ x: 5, y: 6 });
  });

  it('all 7 pieces return 4 cells at any position', () => {
    for (const id of TETROMINO_IDS) {
      const piece: ActivePiece = { def: getTetromino(id), rotation: 0, pos: { x: 3, y: 3 } };
      expect(getCells(piece)).toHaveLength(4);
    }
  });
});
