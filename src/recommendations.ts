import type { Subscription, YouTubeVideo } from './types.ts';
import { searchVideos } from './youtube.ts';
import { AUDIO_FRIENDLY_KEYWORDS, AUDIO_FRIENDLY_CATEGORY_IDS, MIN_AUDIO_DURATION_SECONDS } from './constants.ts';

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
  const queries = topics.slice(0, 4).map(t => `${t} lecture interview podcast`);

  const results = await Promise.allSettled(queries.map(q => searchVideos(token, q)));

  const seen = new Set<string>();
  const videos: YouTubeVideo[] = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const video of result.value) {
      if (!seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
  }

  return videos
    .filter(isAudioFriendly)
    .sort((a, b) => scoreVideo(b) - scoreVideo(a));
}
