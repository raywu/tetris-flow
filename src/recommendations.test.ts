import { describe, it, expect } from 'vitest';
import { extractTopics, isAudioFriendly } from './recommendations.ts';
import type { Subscription, YouTubeVideo } from './types.ts';
import { MIN_AUDIO_DURATION_SECONDS } from './constants.ts';

function makeSub(title: string): Subscription {
  return { channelId: 'UC123', title, description: '' };
}

function makeVideo(overrides: Partial<YouTubeVideo> = {}): YouTubeVideo {
  return {
    videoId: 'v1',
    title: 'Test Video',
    channelTitle: 'Test Channel',
    thumbnailUrl: '',
    durationSeconds: MIN_AUDIO_DURATION_SECONDS + 100,
    categoryId: '22',
    ...overrides,
  };
}

describe('extractTopics', () => {
  it('returns empty array for empty subscriptions', () => {
    expect(extractTopics([])).toEqual([]);
  });

  it('returns at most 6 topics', () => {
    const subs = Array.from({ length: 20 }, (_, i) => makeSub(`Word${i} Channel`));
    expect(extractTopics(subs).length).toBeLessThanOrEqual(6);
  });

  it('excludes stop words', () => {
    const subs = [makeSub('The Official News Channel'), makeSub('The Official TV Network')];
    const topics = extractTopics(subs);
    expect(topics).not.toContain('the');
    expect(topics).not.toContain('official');
    expect(topics).not.toContain('news');
    expect(topics).not.toContain('channel');
    expect(topics).not.toContain('tv');
    expect(topics).not.toContain('network');
  });

  it('ranks most frequent words first', () => {
    const subs = [
      makeSub('Science Academy'),
      makeSub('Science World'),
      makeSub('Science Hub'),
      makeSub('Math Academy'),
    ];
    expect(extractTopics(subs)[0]).toBe('science');
  });

  it('filters out words shorter than 3 characters', () => {
    const subs = [makeSub('AI ML DL Tech')];
    const topics = extractTopics(subs);
    expect(topics).not.toContain('ai');
    expect(topics).not.toContain('ml');
    expect(topics).not.toContain('dl');
  });
});

describe('isAudioFriendly', () => {
  it('returns true for lecture title + education category + sufficient duration', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Full Lecture on Algorithms', categoryId: '27', durationSeconds: 4000 })),
    ).toBe(true);
  });

  it('returns false when duration is below MIN_AUDIO_DURATION_SECONDS regardless of title', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Full Lecture', categoryId: '27', durationSeconds: MIN_AUDIO_DURATION_SECONDS - 1 })),
    ).toBe(false);
  });

  it('returns false when duration is too short and no good category', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Highlights Reel', categoryId: '22', durationSeconds: 600 })),
    ).toBe(false);
  });

  it('returns true for audio-friendly keyword in title with sufficient duration', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Deep Dive Interview with an Expert', durationSeconds: MIN_AUDIO_DURATION_SECONDS + 100 })),
    ).toBe(true);
  });

  it('returns true for good category ID with sufficient duration (no keyword needed)', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Random Content', categoryId: '27', durationSeconds: MIN_AUDIO_DURATION_SECONDS + 100 })),
    ).toBe(true);
  });

  it('returns false when neither keyword nor good category matches, even if long', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Gaming Stream Highlights', categoryId: '22', durationSeconds: 7200 })),
    ).toBe(false);
  });

  it('returns true for podcast keyword with sufficient duration', () => {
    expect(
      isAudioFriendly(makeVideo({ title: 'Weekly Podcast Episode', durationSeconds: MIN_AUDIO_DURATION_SECONDS + 100 })),
    ).toBe(true);
  });
});
