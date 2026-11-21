import { useSyncExternalStore } from 'react';
import { GAME_IDS, type GameId } from './games/types';

// Hash routes (GitHub Pages can't serve other paths):
//   #/                 hub
//   #/<game>           setup for that game
//   #/<game>/play      playing
export type Route = { name: 'hub' } | { name: 'setup'; game: GameId } | { name: 'play'; game: GameId };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const game = parts[0] as GameId;
  if (!GAME_IDS.includes(game)) return { name: 'hub' };
  if (parts[1] === 'play') return { name: 'play', game };
  return { name: 'setup', game };
}

export const href = {
  hub: '#/',
  setup: (g: GameId) => `#/${g}`,
  play: (g: GameId) => `#/${g}/play`,
};

export function go(to: string) {
  window.location.hash = to;
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}
