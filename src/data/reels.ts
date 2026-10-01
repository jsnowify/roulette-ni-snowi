import type { Key } from "../types";
import { brands } from "./brands";
import { categories } from "./categories";
import { moods } from "./moods";

export type ReelDef = {
  key: Key;
  label: string;
  /** Dagdag na ms bago huminto ang reel, para sunod-sunod ang hinto. */
  delay: number;
  /** Mahahabang text: mas maliit na font. */
  long?: boolean;
  /** Lumalabas lang kapag naka-on ang "Extra reels". */
  extra?: boolean;
};

export const REEL_DEFS: readonly ReelDef[] = [
  { key: "brand", label: "Brand", delay: 0 },
  { key: "category", label: "Category", delay: 500, long: true },
  { key: "mood", label: "Mood", delay: 1000, extra: true },
];

export const BUILTIN_ITEMS: Record<Key, readonly string[]> = {
  brand: brands,
  category: categories,
  mood: moods,
};

/** Built-in + sariling entries ng user. */
export const mergeItems = (
  custom: Record<Key, readonly string[]>,
): Record<Key, readonly string[]> => ({
  brand: [...BUILTIN_ITEMS.brand, ...custom.brand],
  category: [...BUILTIN_ITEMS.category, ...custom.category],
  mood: [...BUILTIN_ITEMS.mood, ...custom.mood],
});
