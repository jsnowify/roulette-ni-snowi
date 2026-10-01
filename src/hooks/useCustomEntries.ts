import { useCallback } from "react";
import { BUILTIN_ITEMS } from "../data/reels";
import type { Key } from "../types";
import { usePersistentState } from "./usePersistentState";

export type Custom = Record<Key, string[]>;
export type AddResult = "ok" | "empty" | "duplicate" | "limit";

export const MAX_LEN = 40;
export const MAX_PER_REEL = 30;

const KEYS: readonly Key[] = ["brand", "category", "mood"];
const EMPTY: Custom = { brand: [], category: [], mood: [] };

const isCustom = (v: unknown): v is Custom => {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return KEYS.every((k) => {
    const list = obj[k];
    return (
      Array.isArray(list) &&
      list.length <= MAX_PER_REEL &&
      list.every(
        (x) => typeof x === "string" && x.length > 0 && x.length <= MAX_LEN,
      )
    );
  });
};

/** Sariling brand / category / mood ng user. Naka-save sa localStorage. */
export function useCustomEntries() {
  const [custom, setCustom] = usePersistentState<Custom>(
    "roulette-ni-snowi:custom:v1",
    EMPTY,
    isCustom,
  );

  const add = useCallback(
    (key: Key, raw: string): AddResult => {
      const value = raw.trim().replace(/\s+/g, " ").slice(0, MAX_LEN);
      if (!value) return "empty";

      const lower = value.toLowerCase();
      const taken = [...BUILTIN_ITEMS[key], ...custom[key]].some(
        (x) => x.toLowerCase() === lower,
      );
      if (taken) return "duplicate";
      if (custom[key].length >= MAX_PER_REEL) return "limit";

      setCustom((c) => ({ ...c, [key]: [...c[key], value] }));
      return "ok";
    },
    [custom, setCustom],
  );

  const remove = useCallback(
    (key: Key, value: string) => {
      setCustom((c) => ({ ...c, [key]: c[key].filter((x) => x !== value) }));
    },
    [setCustom],
  );

  return { custom, add, remove };
}
