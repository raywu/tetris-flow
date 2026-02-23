import { describe, it, expect } from 'vitest';
import { tryMove, tryRotate, getGhostPiece, hardDrop } from './piece.ts';
import { createGrid } from './board.ts';
import { getTetromino } from './tetrominoes.ts';
import type { ActivePiece, GameState } from './types.ts';

function makePiece(
  id: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L',
  x: number,
  y: number,
  rotation = 0,
): ActivePiece {
  return { def: getTetromino(id), rotation, pos: { x, y } };
}

function makeState(piece: ActivePiece, board = createGrid()): GameState {
  return {
    board,
    current: piece,
    next: getTetromino('I'),
    score: 0,
    level: 1,
    lines: 0,
    phase: 'playing',
    dropAccumulator: 0,
    lockDelay: 0,
    lockDelayActive: false,
  };
}

describe('tryMove', () => {
  it('moves left on empty board', () => {
    const result = tryMove(makeState(makePiece('T', 5, 5)), -1, 0);
    expect(result).not.toBeNull();
    expect(result!.pos.x).toBe(4);
  });

  it('moves right on empty board', () => {
    const result = tryMove(makeState(makePiece('T', 3, 5)), 1, 0);
    expect(result).not.toBeNull();
    expect(result!.pos.x).toBe(4);
  });

  it('moves down on empty board', () => {
    const result = tryMove(makeState(makePiece('T', 3, 5)), 0, 1);
    expect(result).not.toBeNull();
    expect(result!.pos.y).toBe(6);
  });

  it('returns null when moving into left wall', () => {
    // I rot-0 at x=0: cells x=0,1,2,3. Moving left → x=-1 out of bounds.
    expect(tryMove(makeState(makePiece('I', 0, 5)), -1, 0)).toBeNull();
  });

  it('returns null when moving into locked cell', () => {
    const board = createGrid();
    // T rot-0 at (3,4): moving down → pos (3,5), cells (4,5),(3,6),(4,6),(5,6).
    // grid[6][3] = 1 → cell (3,6) hits.
    board[6]![3] = 1;
    expect(tryMove(makeState(makePiece('T', 3, 4), board), 0, 1)).toBeNull();
  });
});

describe('tryRotate', () => {
  it('T-piece rotates through all 4 states and back to 0', () => {
    let state = makeState(makePiece('T', 4, 5));
    for (let i = 0; i < 4; i++) {
      const rotated = tryRotate(state, 1);
      expect(rotated).not.toBeNull();
      state = makeState(rotated!);
    }
    expect(state.current.rotation).toBe(0);
  });

  it('O-piece rotation returns same shape (all rotations identical)', () => {
    const piece = makePiece('O', 4, 5);
    const rotated = tryRotate(makeState(piece), 1);
    expect(rotated).not.toBeNull();
    expect(rotated!.def.rotations[rotated!.rotation]).toEqual(
      piece.def.rotations[piece.rotation],
    );
  });

  it('I-piece rotation succeeds and advances to rotation 1', () => {
    const rotated = tryRotate(makeState(makePiece('I', 3, 5)), 1);
    expect(rotated).not.toBeNull();
    expect(rotated!.rotation).toBe(1);
  });

  it('T-piece near left wall uses kick offset and still succeeds', () => {
    // At x=0 the basic (0,0) kick candidate fits since T rot-1 offsets are (1,0),(1,1),(2,1),(1,2).
    const rotated = tryRotate(makeState(makePiece('T', 0, 5)), 1);
    expect(rotated).not.toBeNull();
  });
});

describe('getGhostPiece', () => {
  it('ghost y is >= active piece y', () => {
    const state = makeState(makePiece('T', 3, 5));
    expect(getGhostPiece(state).pos.y).toBeGreaterThanOrEqual(5);
  });

  it('ghost rests on the floor for a piece spawned near the top', () => {
    // T rot-0 max y-offset = 1; bottom cells land at pos.y+1.
    // Floor is row 19, so ghost.pos.y = 18.
    const state = makeState(makePiece('T', 3, 0));
    expect(getGhostPiece(state).pos.y).toBe(18);
  });

  it('ghost rests on locked cells', () => {
    const board = createGrid();
    board[10] = new Array<number>(10).fill(1); // full row at 10
    // T bottom cells (y+1) must stay above row 10 → ghost.pos.y = 8.
    const state = makeState(makePiece('T', 3, 0), board);
    expect(getGhostPiece(state).pos.y).toBe(8);
  });
});

describe('hardDrop', () => {
  it('cellsDropped equals ghost.pos.y - piece.pos.y', () => {
    const state = makeState(makePiece('T', 3, 0));
    const { cellsDropped } = hardDrop(state);
    const ghost = getGhostPiece(state);
    expect(cellsDropped).toBe(ghost.pos.y - state.current.pos.y);
  });

  it('returned piece position matches ghost', () => {
    const state = makeState(makePiece('T', 3, 0));
    expect(hardDrop(state).piece.pos).toEqual(getGhostPiece(state).pos);
  });

  it('cellsDropped is 0 when piece is already at rest', () => {
    const board = createGrid();
    // T rot-0 at (3,18): bottom cells at y=19, which is the last valid row.
    // Moving down → pos.y=19, bottom cells at y=20 >= ROWS → collides immediately.
    const state = makeState(makePiece('T', 3, 18), board);
    expect(hardDrop(state).cellsDropped).toBe(0);
  });
});
