# tetris-flow

A browser-based Tetris game built with Vite + Vanilla TypeScript.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build (outputs to dist/)
npm run preview  # preview production build
```

## Structure

```
src/
  main.ts       # entry point
  style.css     # global styles
public/         # static assets
index.html      # app shell
```

## Conventions

- Vanilla TypeScript — no framework, no dependencies beyond Vite
- Game logic in `src/` as plain TS modules (no bundling tricks)
- Canvas-based rendering
- Keep modules focused: separate game loop, board state, input, rendering
