import { briefSentence, sameBrief, type BriefLike } from "./brief";
import { readJSON } from "./storage";

export type SavedBrief = {
  id: string;
  brand: string;
  category: string;
  mood: string | null;
  done: boolean;
  savedAt: number;
  /** Kailan na-check as built. Ginagamit sa streak. */
  doneAt: number | null;
};

// v2 = may id, mood, savedAt, doneAt. Ang v1 ay binabasa pa rin (migration).
export const SAVED_KEY = "roulette-ni-snowi:saved:v2";
const LEGACY_KEY = "roulette-ni-snowi:saved";
export const MAX_SAVED = 200;

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const text = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 80;

/** Ginagawang ligtas na SavedBrief ang kahit anong data galing storage o file. */
function normalize(raw: unknown): SavedBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!text(r.brand) || !text(r.category)) return null;

  const done = r.done === true;
  return {
    id: typeof r.id === "string" && r.id ? r.id : newId(),
    brand: r.brand,
    category: r.category,
    mood: text(r.mood) ? r.mood : null,
    done,
    savedAt: typeof r.savedAt === "number" ? r.savedAt : Date.now(),
    doneAt: done && typeof r.doneAt === "number" ? r.doneAt : null,
  };
}

function parseList(raw: unknown): SavedBrief[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedBrief[] = [];
  for (const item of raw) {
    const brief = normalize(item);
    if (brief && !out.some((x) => sameBrief(x, brief))) out.push(brief);
  }
  return out.slice(0, MAX_SAVED);
}

export function loadSaved(): SavedBrief[] {
  const current = readJSON<unknown>(SAVED_KEY, null);
  if (current !== null) return parseList(current);
  return parseList(readJSON<unknown>(LEGACY_KEY, []));
}

export function createSaved(b: BriefLike): SavedBrief {
  return {
    id: newId(),
    brand: b.brand,
    category: b.category,
    mood: b.mood ?? null,
    done: false,
    savedAt: Date.now(),
    doneAt: null,
  };
}

// ---- Export / Import ----

export const exportJSON = (list: readonly SavedBrief[]) =>
  JSON.stringify(
    { app: "roulette-ni-snowi", version: 2, briefs: list },
    null,
    2,
  );

export const exportMarkdown = (list: readonly SavedBrief[]) =>
  [
    "# Roulette ni snowi: saved briefs",
    "",
    ...list.map((x) => `- [${x.done ? "x" : " "}] ${briefSentence(x)}`),
    "",
  ].join("\n");

/** Ibinabalik ang listahan, o `null` kung hindi valid ang file. */
export function parseImport(raw: string): SavedBrief[] | null {
  try {
    const data: unknown = JSON.parse(raw);
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object"
        ? (data as { briefs?: unknown }).briefs
        : null;
    return Array.isArray(list) ? parseList(list) : null;
  } catch {
    return null;
  }
}
