import type { SavedBrief } from "./saved";

export function computeStats(list: readonly SavedBrief[]) {
  const done = list.filter((x) => x.done);

  const perCategory = new Map<string, number>();
  for (const x of done) {
    perCategory.set(x.category, (perCategory.get(x.category) ?? 0) + 1);
  }

  let topCategory: string | null = null;
  let best = 0;
  for (const [category, n] of perCategory) {
    if (n > best) {
      best = n;
      topCategory = category;
    }
  }

  return {
    built: done.length,
    total: list.length,
    topCategory,
  };
}
