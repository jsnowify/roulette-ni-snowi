import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readJSON, writeJSON } from "../lib/storage";

/**
 * Parang useState, pero naka-save sa localStorage.
 * `isValid` ang nagbabantay: kung luma o sira ang naka-save, `initial` ang gagamitin.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = readJSON<unknown>(key, initial);
    return isValid(raw) ? raw : initial;
  });

  useEffect(() => {
    writeJSON(key, value);
  }, [key, value]);

  return [value, setValue];
}
