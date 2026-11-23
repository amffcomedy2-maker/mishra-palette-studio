// Keeps only one video playing at a time on the public site.

const players = new Map<string, () => void>();

/** Registers a player's pause function; returns an unregister function. */
export function registerPlayer(id: string, pause: () => void): () => void {
  players.set(id, pause);
  return () => {
    if (players.get(id) === pause) players.delete(id);
  };
}

/** Call when a player starts: every other registered player is paused. */
export function claimPlayback(id: string): void {
  players.forEach((pause, key) => {
    if (key === id) return;
    try {
      pause();
    } catch {
      /* player already gone */
    }
  });
}
