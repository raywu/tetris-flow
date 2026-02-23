import { describe, it, expect } from 'vitest';
import { Bag } from './bag.ts';
import { TETROMINO_IDS } from './tetrominoes.ts';

describe('Bag', () => {
  it('first bag of 7 contains exactly all 7 tetromino IDs', () => {
    const bag = new Bag();
    const pieces = Array.from({ length: 7 }, () => bag.next().id);
    expect(new Set(pieces).size).toBe(7);
    for (const id of TETROMINO_IDS) {
      expect(pieces).toContain(id);
    }
  });

  it('second bag of 7 also contains all 7 IDs (refill works)', () => {
    const bag = new Bag();
    for (let i = 0; i < 7; i++) bag.next();
    const pieces = Array.from({ length: 7 }, () => bag.next().id);
    expect(new Set(pieces).size).toBe(7);
    for (const id of TETROMINO_IDS) {
      expect(pieces).toContain(id);
    }
  });

  it('peek returns the same piece as the next next() call', () => {
    const bag = new Bag();
    expect(bag.peek().id).toBe(bag.next().id);
  });

  it('peek does not consume the piece', () => {
    const bag = new Bag();
    const peeked = bag.peek().id;
    bag.peek(); // second peek — should still return same piece
    expect(bag.next().id).toBe(peeked);
  });

  it('over 700 pieces each tetromino appears exactly 100 times', () => {
    const bag = new Bag();
    const counts = new Map<string, number>(TETROMINO_IDS.map(id => [id, 0]));
    for (let i = 0; i < 700; i++) {
      const id = bag.next().id;
      counts.set(id, counts.get(id)! + 1);
    }
    for (const id of TETROMINO_IDS) {
      expect(counts.get(id)).toBe(100);
    }
  });
});
