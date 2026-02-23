import type { Subscription, YouTubeVideo } from './types.ts';
import { fetchPlaylistItems, fetchVideoDetails } from './youtube.ts';
import {
  AUDIO_FRIENDLY_KEYWORDS,
  AUDIO_FRIENDLY_CATEGORY_IDS,
  MIN_AUDIO_DURATION_SECONDS,
  RECOMMENDATION_CHANNEL_SAMPLE,
  PLAYLIST_ITEMS_PER_CHANNEL,
} from './constants.ts';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for',
  'is', 'by', 'with', 'from', 'as', 'it', 'its', 'this', 'that', 'be',
  'are', 'was', 'were', 'has', 'have', 'had', 'but', 'not', 'so', 'if',
  'tv', 'news', 'official', 'channel', 'videos', 'network',
]);

export function extractTopics(subscriptions: Subscription[]): string[] {
  const freq = new Map<string, number>();

  for (const sub of subscriptions) {
    const words = sub.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function selectRelevantChannels(
  subs: Subscription[],
  topics: string[],
  n: number
): Subscription[] {
  const topicSet = new Set(topics);
  return subs
    .map(sub => {
      const tokens = sub.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      const score = tokens.filter(t => topicSet.has(t)).length;
      return { sub, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(x => x.sub);
}

export function isAudioFriendly(video: YouTubeVideo): boolean {
  const titleLower = video.title.toLowerCase();
  const hasKeyword = AUDIO_FRIENDLY_KEYWORDS.some(kw => titleLower.includes(kw));
  const longEnough = video.durationSeconds >= MIN_AUDIO_DURATION_SECONDS;
  const goodCategory = AUDIO_FRIENDLY_CATEGORY_IDS.includes(video.categoryId);
  return (hasKeyword || goodCategory) && longEnough;
}

function scoreVideo(video: YouTubeVideo): number {
  const titleLower = video.title.toLowerCase();
  let score = 0;
  for (const kw of AUDIO_FRIENDLY_KEYWORDS) {
    if (titleLower.includes(kw)) score += 2;
  }
  if (AUDIO_FRIENDLY_CATEGORY_IDS.includes(video.categoryId)) score += 1;
  if (video.durationSeconds >= MIN_AUDIO_DURATION_SECONDS) score += 2;
  return score;
}

export async function buildRecommendations(token: string, subs: Subscription[]): Promise<YouTubeVideo[]> {
  const topics = extractTopics(subs);
  const channels = selectRelevantChannels(subs, topics, RECOMMENDATION_CHANNEL_SAMPLE);

  const playlistResults = await Promise.allSettled(
    channels.map(ch => fetchPlaylistItems(token, ch.channelId.replace(/^UC/, 'UU'), PLAYLIST_ITEMS_PER_CHANNEL))
  );

  const videoIds = [
    ...new Set(
      playlistResults
        .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
        .flatMap(r => r.value)
    ),
  ];

  const videos = await fetchVideoDetails(token, videoIds);
  return videos.filter(isAudioFriendly).sort((a, b) => scoreVideo(b) - scoreVideo(a));
}
