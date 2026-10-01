import type { Plan } from "../types";

/** Ilang filler na row ang dadaan habang umiikot ang reel. */
export const FILLERS = 16;

export const rand = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)]!;

/**
 * "Shuffle bag": hindi uulit ang isang item hangga't hindi pa lumalabas lahat.
 * `seen` ay mutable Set na pag-aari ng caller (nasa useRef, isa kada reel).
 * Hindi rin ibabalik ang `current`, para laging may nagbabago sa reel.
 */
export function drawFromBag(
  list: readonly string[],
  seen: Set<string>,
  current: string | null,
): string {
  if (list.length === 0) throw new Error("Cannot draw from an empty list");
  if (list.length === 1) return list[0]!;

  let pool = list.filter((x) => !seen.has(x) && x !== current);
  if (pool.length === 0) {
    // Naubos na ang bag: simulan ulit.
    seen.clear();
    if (current !== null) seen.add(current);
    pool = list.filter((x) => x !== current);
  }

  const item = rand(pool);
  seen.add(item);
  return item;
}

/** Ang 3 row na nakikita sa reel: itaas, gitna (value), ibaba. */
export function around(
  list: readonly string[],
  value: string | null,
): string[] {
  if (value === null) return ["", "", ""]; // bagong bukas: walang laman
  const i = list.indexOf(value);
  if (i === -1) return ["", value, ""]; // halimbawa: natanggal na custom entry
  return [
    list[(i - 1 + list.length) % list.length]!,
    value,
    list[(i + 1) % list.length]!,
  ];
}

export const makePlan = (
  list: readonly string[],
  value: string,
  id: number,
): Plan => ({
  id,
  value,
  fillers: Array.from({ length: FILLERS }, () => rand(list)),
  post: rand(list),
});

// ---- Seeded random (para sa "Today's brief": pareho ang labas ng lahat sa isang araw) ----

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: maliit at mabilis na deterministic RNG
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededPick(list: readonly string[], seed: string): string {
  const rng = mulberry32(hashString(seed));
  return list[Math.floor(rng() * list.length)]!;
}

/** YYYY-MM-DD sa local time ng user. */
export function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
