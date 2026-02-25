# tetris-flow

A browser-based Tetris game with YouTube integration — play Tetris while listening to long-form YouTube videos (lectures, podcasts, interviews) selected from your subscriptions.

## Commands

```bash
npm run dev        # start dev server (localhost:5173)
npm run build      # vitest run && tsc && vite build → dist/
npm run preview    # preview production build
npm run test       # run tests once
npm run test:watch # run tests in watch mode
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
  firebase.ts       # Firestore init, addScore/getTopScores
  leaderboard.ts    # leaderboard modal UI
  debug.ts          # debug overlay (OAuth client switch, dev-only)
  gis.d.ts          # Google Identity Services type declarations
  style.css         # global styles (pregame, game, leaderboard, overlay)
  *.test.ts         # vitest unit tests (mirror each module)
docs/
  hosting-strategy.md  # Vercel + subdomain deployment walkthrough
  optimization-plan.md # optimization commit tracker
public/             # static assets
index.html          # app shell
```

## YouTube Integration

- OAuth via Google Identity Services (GIS); token persisted in `sessionStorage`
- Recommendations built from subscription topics → `playlistItems.list` → `videos.list`, filtered for audio-friendly long-form content
- YouTube IFrame Player API loaded dynamically; player sits behind the game canvas
- Video change flow: pause game → show pregame panel → select or search → resume
- Dual OAuth client IDs: `VITE_GOOGLE_CLIENT_ID_2` enables quota switching. `debug.ts` overlay (dev-only, `?debug` URL param) shows active slot and switch button. `switchClientId()` clears token + all caches + reloads.

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

## Environment Variables

All prefixed with `VITE_` and baked at build time by Vite. Must redeploy Vercel after changes. See `.env.example`.

| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Primary Google OAuth client ID |
| `VITE_GOOGLE_CLIENT_ID_2` | Secondary OAuth client ID (quota switching) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## Firebase / Leaderboard

Firestore in Native mode. Collection: `scores/{userId}/entries`. Per-user top-10 scores. `firebase.ts` handles persistence, `leaderboard.ts` renders modal. Security rules constrain data shape (score as bounded int, videoTitle as bounded string, server timestamp for playedAt, no updates/deletes).

## Deployment

Vercel (free tier) via GitHub integration — push to `master` triggers build + deploy automatically. No Vercel CLI needed. Live at `https://tetris.raywu.org`. CNAME from registrar. Full setup: `docs/hosting-strategy.md`.

## Testing

vitest (node env). `*.test.ts` files parallel each module. `npm run build` runs tests before type-check and bundling — failing tests abort Vercel deploys.

## Conventions

- Vanilla TypeScript — no framework, no dependencies beyond Vite
- Game logic in `src/` as plain TS modules (no bundling tricks)
- Canvas-based rendering
- Keep modules focused: separate game loop, board state, input, rendering
- `style.css` — single global stylesheet, no CSS modules
- Debug overlay loads only in dev mode (`import.meta.env.DEV`)
