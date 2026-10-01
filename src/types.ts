export type Key = "brand" | "category" | "mood";

/** Ang laman ng mga reel ngayon. `null` = hindi pa na-spin ang reel na iyon. */
export type Brief = Record<Key, string | null>;

/** Brief na kumpleto na ang dalawang required na reel (brand at category). */
export type CompleteBrief = Brief & { brand: string; category: string };

/** Plano ng isang spin para sa isang reel: mga filler habang umiikot, tapos ang final value. */
export type Plan = {
  id: number;
  fillers: string[];
  value: string;
  post: string;
};

export const isComplete = (b: Brief): b is CompleteBrief =>
  b.brand !== null && b.category !== null;
