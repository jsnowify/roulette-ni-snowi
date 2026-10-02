import { isComplete, type Brief, type CompleteBrief, type Key } from "../types";

/** Kahit anong object na may brand + category. Ang mood ay optional. */
export type BriefLike = {
  brand: string;
  category: string;
  mood?: string | null;
};

export const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

export function briefSentence(b: BriefLike): string {
  const parts = [
    `Build ${b.brand}, ${article(b.category)} ${b.category} brand, from scratch in seven days.`,
  ];
  if (b.mood) parts.push(`Mood: ${b.mood}.`);
  return parts.join(" ");
}

export const sameBrief = (a: BriefLike, b: BriefLike) =>
  a.brand === b.brand &&
  a.category === b.category &&
  (a.mood ?? null) === (b.mood ?? null);

// ---- Share link: ?brand=Hoshi&category=Luxury&mood=Calm ----

export function toSearch(b: BriefLike): string {
  const p = new URLSearchParams();
  p.set("brand", b.brand);
  p.set("category", b.category);
  if (b.mood) p.set("mood", b.mood);
  return p.toString();
}

/**
 * Binabasa ang brief mula sa URL. Tinatanggap lang ang values na nasa listahan
 * natin (built-in o sarili mong entries), kaya hindi pwedeng maglagay ng
 * kung anu-anong text sa link.
 */
export function fromSearch(
  search: string,
  items: Record<Key, readonly string[]>,
): CompleteBrief | null {
  const p = new URLSearchParams(search);
  const read = (key: Key) => {
    const v = p.get(key);
    return v !== null && items[key].includes(v) ? v : null;
  };
  const brief: Brief = {
    brand: read("brand"),
    category: read("category"),
    mood: read("mood"),
  };
  return isComplete(brief) ? brief : null;
}
