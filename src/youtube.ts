import type { Subscription, YouTubeVideo } from './types.ts';
import { YOUTUBE_API_BASE } from './constants.ts';

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? '0');
  const m = parseInt(match[2] ?? '0');
  const s = parseInt(match[3] ?? '0');
  return h * 3600 + m * 60 + s;
}

async function apiFetch(token: string, path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchSubscriptions(token: string): Promise<Subscription[]> {
  const data = await apiFetch(token, 'subscriptions', {
    part: 'snippet',
    mine: 'true',
    maxResults: '50',
  });
  return (data.items ?? []).map((item: any) => ({
    channelId: item.snippet.resourceId.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
  }));
}

export async function searchVideos(token: string, query: string): Promise<YouTubeVideo[]> {
  const data = await apiFetch(token, 'search', {
    part: 'snippet',
    q: query,
    type: 'video',
    videoDuration: 'long',
    videoCategoryId: '27',
    maxResults: '10',
    order: 'relevance',
  });

  const ids: string[] = (data.items ?? []).map((item: any) => item.id.videoId);
  if (ids.length === 0) return [];
  return fetchVideoDetails(token, ids);
}

export async function fetchVideoDetails(token: string, videoIds: string[]): Promise<YouTubeVideo[]> {
  const data = await apiFetch(token, 'videos', {
    part: 'snippet,contentDetails',
    id: videoIds.join(','),
  });

  return (data.items ?? []).map((item: any) => ({
    videoId: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
    durationSeconds: parseDuration(item.contentDetails?.duration ?? ''),
    categoryId: item.snippet.categoryId ?? '',
  }));
}
