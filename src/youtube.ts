import type { Subscription, YouTubeVideo } from './types.ts';
import { YOUTUBE_API_BASE } from './constants.ts';
import { getCached, setCached } from './cache.ts';

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

async function apiPost(token: string, path: string, params: Record<string, string>, body: object): Promise<any> {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function addToWatchLater(token: string, videoId: string): Promise<void> {
  await apiPost(token, 'playlistItems', { part: 'snippet' }, {
    snippet: {
      playlistId: 'WL',
      resourceId: { kind: 'youtube#video', videoId },
    },
  });
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

export async function fetchPlaylistItems(
  token: string,
  playlistId: string,
  maxResults = 15
): Promise<string[]> {
  const data = await apiFetch(token, 'playlistItems', {
    part: 'snippet',
    playlistId,
    maxResults: String(maxResults),
  });
  return (data.items ?? [])
    .map((item: any) => item.snippet?.resourceId?.videoId as string)
    .filter(Boolean);
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
  const PREFIX = 'yt_video_';
  const cached: YouTubeVideo[] = [];
  const missing: string[] = [];

  for (const id of videoIds) {
    const hit = getCached<YouTubeVideo>(`${PREFIX}${id}`, Infinity, sessionStorage);
    if (hit) cached.push(hit);
    else missing.push(id);
  }

  if (missing.length === 0) return cached;

  const BATCH = 50;
  const fetched: YouTubeVideo[] = [];

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const data = await apiFetch(token, 'videos', {
      part: 'snippet,contentDetails',
      id: batch.join(','),
    });
    for (const item of data.items ?? []) {
      const video: YouTubeVideo = {
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
        durationSeconds: parseDuration(item.contentDetails?.duration ?? ''),
        categoryId: item.snippet.categoryId ?? '',
      };
      fetched.push(video);
      setCached(`${PREFIX}${video.videoId}`, video, sessionStorage);
    }
  }

  return [...cached, ...fetched];
}
