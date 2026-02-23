# tetris-flow

A browser-based Tetris game with YouTube integration — play Tetris while listening to long-form YouTube videos (lectures, podcasts, interviews) selected from your subscriptions.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build (outputs to dist/)
npm run preview  # preview production build
```

## Structure

```
src/
  main.ts           # entry point, orchestrates pregame → game flow
  game.ts           # game loop
  board.ts          # board state
  piece.ts          # active piece logic
  renderer.ts       # canvas rendering
  input.ts          # keyboard input
  scoring.ts        # score/level logic
  tetrominoes.ts    # tetromino shapes
  bag.ts            # 7-bag randomizer
  pregame.ts        # PreGameScreen — sign-in, recommendations, search
  auth.ts           # Google OAuth (GIS), token stored in sessionStorage
  youtube.ts        # YouTube Data API v3 calls (subscriptions, search, video details)
  recommendations.ts # topic extraction from subs, audio-friendly filtering/scoring
  player.ts         # YouTubePlayer wrapper (iframe API)
  cache.ts          # localStorage/sessionStorage cache utility
  types.ts          # shared TypeScript interfaces
  constants.ts      # API base URL, category IDs, audio-friendly keywords
public/             # static assets
index.html          # app shell
```

## YouTube Integration

- OAuth via Google Identity Services (GIS); token persisted in `sessionStorage`
- Recommendations built from subscription topics → `playlistItems.list` → `videos.list`, filtered for audio-friendly long-form content
- YouTube IFrame Player API loaded dynamically; player sits behind the game canvas
- Video change flow: pause game → show pregame panel → select or search → resume

## API Quota

YouTube Data API v3 quota: **10,000 units/day**. Costs per cold session start: ~27 units (`playlistItems.list` per channel). Caching is critical.

### Caching strategy (`src/cache.ts`)

| Cache | Storage | TTL | Key |
|---|---|---|---|
| Recommendations | localStorage | 24h | `yt_recommendations` |
| Subscriptions | localStorage | 7d | `yt_subscriptions` |
| Search results | sessionStorage | session | `yt_search_${query}` |
| Video details | sessionStorage | session | `yt_video_${id}` |

Refresh button bypasses recommendation cache (passes `forceRefresh=true`).

## Conventions

- Vanilla TypeScript — no framework, no dependencies beyond Vite
- Game logic in `src/` as plain TS modules (no bundling tricks)
- Canvas-based rendering
- Keep modules focused: separate game loop, board state, input, rendering
