export interface Point {
  x: number;
  y: number;
}

export type Shape = Point[];

export type RotationTable = [Shape, Shape, Shape, Shape];

export type TetrominoId = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoDef {
  id: TetrominoId;
  rotations: RotationTable;
  colorIndex: number; // 1–7
}

export interface ActivePiece {
  def: TetrominoDef;
  rotation: number; // 0, 1, 2, 3
  pos: Point;
}

export interface GameState {
  board: number[][];
  current: ActivePiece;
  next: TetrominoDef;
  score: number;
  level: number;
  lines: number;
  phase: 'playing' | 'paused' | 'gameover';
  dropAccumulator: number;
  lockDelay: number;
  lockDelayActive: boolean;
}
