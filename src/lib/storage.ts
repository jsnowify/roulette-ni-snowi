// Ligtas na localStorage. Maaaring mag-throw ito (private mode, naka-block, puno),
// kaya laging naka-try/catch para hindi mag-crash ang app.

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* walang storage: hindi lang magpe-persist, okay lang */
  }
}
