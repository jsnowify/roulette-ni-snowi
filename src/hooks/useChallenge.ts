import { useEffect, useState } from 'react';
import { CHALLENGE_KEY, isChallenge, type Challenge } from '../lib/challenge';
import { readJSON, writeJSON } from '../lib/storage';

export function useChallenge() {
  const [challenge, setChallenge] = useState<Challenge | null>(() => {
    const stored = readJSON<unknown>(CHALLENGE_KEY, null);
    return isChallenge(stored) ? stored : null;
  });
  // Write immediately: reloading during a reel animation must keep the draw.
  function updateChallenge(next: Challenge | null) {
    writeJSON(CHALLENGE_KEY, next);
    setChallenge(next);
  }
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== CHALLENGE_KEY && event.key !== null) return;
      const stored = readJSON<unknown>(CHALLENGE_KEY, null);
      if (isChallenge(stored)) setChallenge(stored);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return { challenge, updateChallenge };
}
