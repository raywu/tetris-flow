import { describe, it, expect } from 'vitest';
import { createGrid, collides, lockPiece, clearLines } from './board.ts';
import { getTetromino } from './tetrominoes.ts';
import type { ActivePiece } from './types.ts';
import { COLS, ROWS } from './constants.ts';

function makePiece(
  id: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L',
  x: number,
  y: number,
  rotation = 0,
): ActivePiece {
  return { def: getTetromino(id), rotation, pos: { x, y } };
}

// Creates a 20×10 grid with specified row indices filled solid.
function makeGrid(fullRows: number[] = [], colorIndex = 1): number[][] {
  const grid = createGrid();
  for (const row of fullRows) {
    grid[row] = new Array<number>(COLS).fill(colorIndex);
  }
  return grid;
}

describe('createGrid', () => {
  it('returns 20×10 grid of zeros', () => {
    const grid = createGrid();
    expect(grid).toHaveLength(ROWS);
    expect(grid[0]).toHaveLength(COLS);
    expect(grid.every(row => row.every(cell => cell === 0))).toBe(true);
  });
});

describe('collides', () => {
  it('returns false for piece within bounds on empty board', () => {
    const grid = createGrid();
    expect(collides(grid, makePiece('T', 3, 5))).toBe(false);
  });

  it('returns true when piece extends past left edge', () => {
    const grid = createGrid();
    // I rot-0: offsets (0,1),(1,1),(2,1),(3,1). At x=-2 → cell x=-2 < 0.
    expect(collides(grid, makePiece('I', -2, 5))).toBe(true);
  });

  it('returns true when piece extends past right edge', () => {
    const grid = createGrid();
    // I rot-0 at x=8: cells x=8,9,10,11 — x=10 >= COLS.
    expect(collides(grid, makePiece('I', 8, 5))).toBe(true);
  });

  it('returns true when piece extends below bottom row', () => {
    const grid = createGrid();
    // O rot-0: offsets y=0 and y=1. At y=19 → cell y=20 >= ROWS.
    expect(collides(grid, makePiece('O', 4, 19))).toBe(true);
  });

  it('returns true when piece overlaps a locked cell', () => {
    const grid = createGrid();
    // T rot-0 at (3,4): cells (4,4),(3,5),(4,5),(5,5). Set grid[5][4] = 1 → cell (4,5) hits.
    grid[5]![4] = 1;
    expect(collides(grid, makePiece('T', 3, 4))).toBe(true);
  });
});

describe('lockPiece', () => {
  it('sets grid cells to the piece colorIndex', () => {
    const grid = createGrid();
    // O colorIndex=2, rot-0: offsets (1,0),(2,0),(1,1),(2,1). At pos (4,4) → (5,4),(6,4),(5,5),(6,5).
    const piece = makePiece('O', 4, 4);
    lockPiece(grid, piece);
    expect(grid[4]![5]).toBe(2);
    expect(grid[4]![6]).toBe(2);
    expect(grid[5]![5]).toBe(2);
    expect(grid[5]![6]).toBe(2);
  });

  it('does not modify cells outside the piece', () => {
    const grid = createGrid();
    lockPiece(grid, makePiece('O', 4, 4));
    expect(grid[4]![4]).toBe(0);
    expect(grid[4]![7]).toBe(0);
  });
});

describe('clearLines', () => {
  it('returns 0 and leaves grid unchanged when no full rows', () => {
    const grid = createGrid();
    grid[19]![0] = 1; // partial row
    const snapshot = grid.map(r => [...r]);
    expect(clearLines(grid)).toBe(0);
    expect(grid).toEqual(snapshot);
  });

  it('clears 1 full row and prepends a zero row', () => {
    const grid = makeGrid([19]);
    expect(clearLines(grid)).toBe(1);
    expect(grid).toHaveLength(ROWS);
    expect(grid[0]!.every(c => c === 0)).toBe(true);
    expect(grid[19]!.every(c => c === 0)).toBe(true);
  });

  it('clears 4 full rows (Tetris) — board is empty afterwards', () => {
    const grid = makeGrid([16, 17, 18, 19]);
    expect(clearLines(grid)).toBe(4);
    expect(grid).toHaveLength(ROWS);
    expect(grid.every(row => row.every(c => c === 0))).toBe(true);
  });

  it('does not clear partial rows', () => {
    const grid = createGrid();
    grid[19]![0] = 1;
    expect(clearLines(grid)).toBe(0);
    expect(grid[19]![0]).toBe(1);
  });
});
