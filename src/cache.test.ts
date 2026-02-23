import { describe, it, expect } from 'vitest';
import { getCached, setCached } from './cache.ts';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, value); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

describe('getCached / setCached', () => {
  it('round-trips a primitive value', () => {
    const storage = new MockStorage();
    setCached('k', 'hello', storage);
    expect(getCached('k', 60_000, storage)).toBe('hello');
  });

  it('round-trips a complex object', () => {
    const storage = new MockStorage();
    const obj = { a: 1, b: [1, 2, 3], c: { nested: true } };
    setCached('k', obj, storage);
    expect(getCached('k', 60_000, storage)).toEqual(obj);
  });

  it('returns null for a missing key', () => {
    expect(getCached('no-such-key', 60_000, new MockStorage())).toBeNull();
  });

  it('returns value for a fresh entry', () => {
    const storage = new MockStorage();
    storage.setItem('k', JSON.stringify({ value: 'fresh', timestamp: Date.now() }));
    expect(getCached('k', 60_000, storage)).toBe('fresh');
  });

  it('returns null for an expired entry', () => {
    const storage = new MockStorage();
    storage.setItem('k', JSON.stringify({ value: 'old', timestamp: Date.now() - 10_000 }));
    expect(getCached('k', 5_000, storage)).toBeNull();
  });

  it('removes the entry after expiry', () => {
    const storage = new MockStorage();
    storage.setItem('k', JSON.stringify({ value: 'old', timestamp: Date.now() - 10_000 }));
    getCached('k', 5_000, storage);
    expect(storage.getItem('k')).toBeNull();
  });

  it('ttlMs=Infinity never expires even with timestamp=0', () => {
    const storage = new MockStorage();
    storage.setItem('k', JSON.stringify({ value: 'ancient', timestamp: 0 }));
    expect(getCached('k', Infinity, storage)).toBe('ancient');
  });

  it('returns null for corrupt JSON without throwing', () => {
    const storage = new MockStorage();
    storage.setItem('k', 'not{{valid-json');
    expect(getCached('k', 60_000, storage)).toBeNull();
  });
});
