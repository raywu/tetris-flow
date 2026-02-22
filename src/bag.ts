import type { TetrominoDef } from './types.ts';
import { TETROMINO_IDS, getTetromino } from './tetrominoes.ts';

// 7-bag randomizer: each bag contains exactly one of each piece, shuffled.
// Prevents long droughts of any single piece.
export class Bag {
  private queue: TetrominoDef[] = [];

  constructor() {
    this.refill();
  }

  next(): TetrominoDef {
    if (this.queue.length === 0) this.refill();
    return this.queue.shift()!;
  }

  peek(): TetrominoDef {
    if (this.queue.length === 0) this.refill();
    return this.queue[0]!;
  }

  private refill(): void {
    const shuffled = [...TETROMINO_IDS]
      .map(id => ({ id, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ id }) => getTetromino(id));
    this.queue.push(...shuffled);
  }
}
