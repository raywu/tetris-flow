import type { ActivePiece } from './types.ts';
import { COLS, ROWS } from './constants.ts';
import { getCells } from './tetrominoes.ts';

export function createGrid(): number[][] {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

export function collides(grid: number[][], piece: ActivePiece): boolean {
  for (const cell of getCells(piece)) {
    if (cell.x < 0 || cell.x >= COLS) return true;
    if (cell.y >= ROWS) return true;
    if (cell.y >= 0 && grid[cell.y]![cell.x] !== 0) return true;
  }
  return false;
}

export function lockPiece(grid: number[][], piece: ActivePiece): void {
  for (const cell of getCells(piece)) {
    if (cell.y >= 0) {
      grid[cell.y]![cell.x] = piece.def.colorIndex;
    }
  }
}

export function clearLines(grid: number[][]): number {
  let cleared = 0;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (grid[row]!.every(cell => cell !== 0)) {
      grid.splice(row, 1);
      grid.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      row++; // recheck same index (row above shifted down)
    }
  }
  return cleared;
}

export function isBlockOut(grid: number[][], piece: ActivePiece): boolean {
  return collides(grid, piece);
}
