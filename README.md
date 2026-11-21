# Tic Tac Toe

A playful tic-tac-toe for the web: 2 players or vs the computer (easy / medium / hard),
with a library of mark pairs (X vs O, Plus vs Minus, Sun vs Moon, and more).

**Play it:** https://rgmes.github.io/tic-tac-toe/

Built with Vite + React + TypeScript, Motion for animation, and canvas-confetti.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # game rules + computer opponent tests
npm run build    # static site in dist/
```

Every push to `main` runs the tests, builds, and deploys to GitHub Pages
(`.github/workflows/deploy.yml`).

The build in `dist/` must be served by a web server or static host (GitHub Pages, Netlify).
Opening `dist/index.html` directly from disk will not work.

## Adding a mark pair

Add an entry to `MARK_SETS` in `src/marks/library.ts`. Draw on a 100x100 canvas, and make
sure the two marks differ in shape, not only colour.
