# Playroom

A playful little games room for the web. Pick a game, play a friend on the same device or take on
the computer (easy / medium / hard), and choose the marks you play with: X vs O, Plus vs Minus,
Frog vs Fox, Robot vs Alien, and more.

**Play it:** https://rgmes.github.io/playroom/

## Games

- **Tic Tac Toe**: the classic 3x3. On Hard the computer never loses; a draw is the best you can do.
- **Four in a Row**: drop discs into a 7x6 board and line up four across, down or diagonally.
  Hard is tough but beatable. The computer thinks in a Web Worker so the page never freezes.

Scores are kept per game and per mode in your browser (localStorage).

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

## Adding a game

1. Create `src/games/<id>/` with the rules (`logic.ts`, implementing `Rules` from
   `src/games/types.ts`), a computer player, a `Board` component and a `Preview` for the hub card.
2. Add the id to `GameId` and `GAME_IDS` in `src/games/types.ts`, its rules to
   `src/games/rules.ts`, and its entry to `GAMES` in `src/games/registry.tsx`.

## Adding a mark pair

Add an entry to `MARK_SETS` in `src/marks/library.ts`. Draw on a 100x100 canvas, and make
sure the two marks differ in shape, not only colour. Every set works in every game: in
Four in a Row the mark is drawn on a coloured disc.
