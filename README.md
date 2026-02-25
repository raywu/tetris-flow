# tetris-flow

Browser Tetris with YouTube audio — play while listening to long-form videos
from your subscriptions.

**Live:** https://tetris.raywu.org

## Setup

```
git clone https://github.com/raywu/tetris-flow.git && cd tetris-flow
npm install
cp .env.example .env.local   # fill in values (see CLAUDE.md)
npm run dev                   # http://localhost:5173
```

## Build & Test

```
npm run build       # tests + type-check + bundle
npm run test        # tests only
```

## Deployment

Auto-deploys to Vercel on push to `master`. See docs/hosting-strategy.md.

## Stack

Vanilla TypeScript, Vite, Canvas, YouTube Data API v3, Firebase Firestore
