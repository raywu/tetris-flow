import type { ActivePiece, GameState, Point, TetrominoId } from './types.ts';
import { collides } from './board.ts';

export function tryMove(state: GameState, dx: number, dy: number): ActivePiece | null {
  const moved: ActivePiece = {
    ...state.current,
    pos: { x: state.current.pos.x + dx, y: state.current.pos.y + dy },
  };
  return collides(state.board, moved) ? null : moved;
}

export function tryRotate(state: GameState, direction: 1 | -1): ActivePiece | null {
  const current = state.current;
  const nextRotation = ((current.rotation + direction + 4) % 4);
  const kicks = getKickOffsets(current.def.id, current.rotation, nextRotation);

  for (const kick of kicks) {
    const candidate: ActivePiece = {
      ...current,
      rotation: nextRotation,
      pos: { x: current.pos.x + kick.x, y: current.pos.y + kick.y },
    };
    if (!collides(state.board, candidate)) return candidate;
  }
  return null;
}

export function getGhostPiece(state: GameState): ActivePiece {
  let ghost = state.current;
  while (true) {
    const dropped: ActivePiece = {
      ...ghost,
      pos: { x: ghost.pos.x, y: ghost.pos.y + 1 },
    };
    if (collides(state.board, dropped)) break;
    ghost = dropped;
  }
  return ghost;
}

export function hardDrop(state: GameState): { piece: ActivePiece; cellsDropped: number } {
  let piece = state.current;
  let cellsDropped = 0;
  while (true) {
    const dropped: ActivePiece = {
      ...piece,
      pos: { x: piece.pos.x, y: piece.pos.y + 1 },
    };
    if (collides(state.board, dropped)) break;
    piece = dropped;
    cellsDropped++;
  }
  return { piece, cellsDropped };
}

// SRS wall kick offsets in screen coordinates (y increases downward).
// Derived from Tetris Guideline by negating the y-axis.
type KickKey = `${number}_${number}`;

const JLSTZ_KICKS: Record<KickKey, Point[]> = {
  '0_1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '1_0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '1_2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '2_1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '2_3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '3_2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '3_0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '0_3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
};

const I_KICKS: Record<KickKey, Point[]> = {
  '0_1': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  '1_0': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  '1_2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
  '2_1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  '2_3': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  '3_2': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  '3_0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  '0_3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
};

function getKickOffsets(id: TetrominoId, from: number, to: number): Point[] {
  if (id === 'O') return [{ x: 0, y: 0 }];
  const key: KickKey = `${from}_${to}`;
  const table = id === 'I' ? I_KICKS : JLSTZ_KICKS;
  return table[key] ?? [{ x: 0, y: 0 }];
}
