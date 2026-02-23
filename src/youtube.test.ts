import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDuration, getVideoRating, rateVideo, fetchVideoDetails } from './youtube.ts';
import { setCached } from './cache.ts';
import type { YouTubeVideo } from './types.ts';

class MockStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, value); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

describe('parseDuration', () => {
  it('parses PT1H30M45S → 5445', () => {
    expect(parseDuration('PT1H30M45S')).toBe(5445);
  });

  it('parses PT45M → 2700', () => {
    expect(parseDuration('PT45M')).toBe(2700);
  });

  it('parses PT10S → 10', () => {
    expect(parseDuration('PT10S')).toBe(10);
  });

  it('parses PT2H → 7200', () => {
    expect(parseDuration('PT2H')).toBe(7200);
  });

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });

  it('returns 0 for invalid string', () => {
    expect(parseDuration('notaduration')).toBe(0);
  });
});

describe('getVideoRating', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns "like" when API responds with myRating: like', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [{ myRating: 'like' }] }),
      text: () => Promise.resolve(''),
    }));
    expect(await getVideoRating('token', 'vid1')).toBe('like');
  });

  it('returns "none" when items array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
      text: () => Promise.resolve(''),
    }));
    expect(await getVideoRating('token', 'vid1')).toBe('none');
  });

  it('returns "none" when items is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }));
    expect(await getVideoRating('token', 'vid1')).toBe('none');
  });
});

describe('rateVideo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls POST /videos/rate with the correct rating param', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', mockFetch);

    await rateVideo('token', 'vid1', 'like');

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/videos/rate');
    expect(calledUrl).toContain('rating=like');
  });

  it('throws on non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    }));
    await expect(rateVideo('token', 'vid1', 'like')).rejects.toThrow();
  });
});

describe('fetchVideoDetails', () => {
  let mockSessionStorage: MockStorage;

  beforeEach(() => {
    mockSessionStorage = new MockStorage();
    vi.stubGlobal('sessionStorage', mockSessionStorage);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns cached video without calling fetch (cache hit)', async () => {
    const video: YouTubeVideo = {
      videoId: 'abc',
      title: 'Cached Video',
      channelTitle: 'Channel',
      thumbnailUrl: '',
      durationSeconds: 3600,
      categoryId: '27',
    };
    setCached('yt_video_abc', video, mockSessionStorage);

    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const results = await fetchVideoDetails('token', ['abc']);
    expect(results).toHaveLength(1);
    expect(results[0]!.videoId).toBe('abc');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches and caches on cache miss', async () => {
    const apiVideo = {
      id: 'xyz',
      snippet: {
        title: 'Fetched Video',
        channelTitle: 'Channel',
        categoryId: '27',
        thumbnails: { medium: { url: 'http://img' } },
      },
      contentDetails: { duration: 'PT1H' },
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [apiVideo] }),
      text: () => Promise.resolve(''),
    }));

    const results = await fetchVideoDetails('token', ['xyz']);
    expect(results).toHaveLength(1);
    expect(results[0]!.videoId).toBe('xyz');
    expect(results[0]!.durationSeconds).toBe(3600);

    // Subsequent call should use cache, not fetch again
    vi.stubGlobal('fetch', vi.fn());
    const cached = await fetchVideoDetails('token', ['xyz']);
    expect(cached[0]!.videoId).toBe('xyz');
  });
});
