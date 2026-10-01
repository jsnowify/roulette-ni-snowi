import { useCallback, useEffect, useState } from "react";
import { sameBrief, type BriefLike } from "../lib/brief";
import {
  MAX_SAVED,
  SAVED_KEY,
  createSaved,
  loadSaved,
  newId,
  type SavedBrief,
} from "../lib/saved";
import { writeJSON } from "../lib/storage";

export function useSavedBriefs() {
  const [saved, setSaved] = useState<SavedBrief[]>(loadSaved);

  useEffect(() => {
    writeJSON(SAVED_KEY, saved);
  }, [saved]);

  const has = useCallback(
    (b: BriefLike) => saved.some((x) => sameBrief(x, b)),
    [saved],
  );

  const add = useCallback(
    (b: BriefLike) => {
      if (saved.length >= MAX_SAVED || saved.some((x) => sameBrief(x, b))) {
        return false;
      }
      setSaved((list) => list.length >= MAX_SAVED || list.some((x) => sameBrief(x, b))
        ? list : [createSaved(b), ...list]);
      return true;
    },
    [saved],
  );

  const toggleDone = useCallback((id: string) => {
    setSaved((list) =>
      list.map((x) =>
        x.id === id
          ? { ...x, done: !x.done, doneAt: x.done ? null : Date.now() }
          : x,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((list) => list.filter((x) => x.id !== id));
  }, []);

  /** Idinadagdag ang bago lang (walang duplicate). Ibinabalik kung ilan ang pumasok. */
  const importBriefs = useCallback(
    (incoming: readonly SavedBrief[]) => {
      const fresh = incoming
        .filter((x) => !saved.some((s) => sameBrief(s, x)))
        .slice(0, Math.max(0, MAX_SAVED - saved.length))
        .map((x) => ({ ...x, id: newId() }));

      if (fresh.length > 0) setSaved((list) => [...list, ...fresh]);
      return fresh.length;
    },
    [saved],
  );

  return { saved, has, add, toggleDone, remove, importBriefs };
}
