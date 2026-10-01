import Lenis from "lenis";
import { useEffect, useMemo, useRef, useState } from "react";
import CategoryNote from "./components/CategoryNote";
import Header from "./components/Header";
import Reel from "./components/Reel";
import SavedBriefs from "./components/SavedBriefs";
import { BUILTIN_ITEMS, REEL_DEFS, mergeItems } from "./data/reels";
import { useCustomEntries } from "./hooks/useCustomEntries";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSavedBriefs } from "./hooks/useSavedBriefs";
import { article, briefSentence, fromSearch, toSearch } from "./lib/brief";
import { drawFromBag, makePlan, seededPick, todayKey } from "./lib/random";
import { sfx } from "./lib/sound";
import { isComplete, type Brief, type Key, type Plan } from "./types";

// Walang laman ang reels pagbukas ng site. Lalabas lang ang brief pagkatapos ng unang spin.
const EMPTY: Brief = {
  brand: null,
  category: null,
  mood: null,
};
const NO_LOCKS: Record<Key, boolean> = {
  brand: false,
  category: false,
  mood: false,
};

const HISTORY_MAX = 8; // kasama ang kasalukuyan; 7 ang "earlier spins"
const EXTRAS_KEY = "roulette-ni-snowi:extras";
const SOUND_KEY = "roulette-ni-snowi:sound";

const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

export default function App() {
  const { custom } = useCustomEntries();
  const items = useMemo(() => mergeItems(custom), [custom]);

  // Kung galing sa share link (?brand=...&category=...), iyon ang unang laman.
  const [fromLink] = useState(() => fromSearch(window.location.search, items));
  const [pick, setPick] = useState<Brief>(fromLink ?? EMPTY);
  const [history, setHistory] = useState<Brief[]>(() =>
    fromLink ? [fromLink] : [],
  );

  const [extras, setExtras] = usePersistentState(EXTRAS_KEY, false, isBoolean);
  const [soundOn, setSoundOn] = usePersistentState(SOUND_KEY, false, isBoolean);

  const [plans, setPlans] = useState<Partial<Record<Key, Plan>>>({});
  const [lock, setLock] = useState<Record<Key, boolean>>(NO_LOCKS);
  const [spinId, setSpinId] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState<"brief" | "link" | null>(null);

  const savedApi = useSavedBriefs();

  // Mutable na hawak na hindi nagti-trigger ng render.
  const pending = useRef(0); // ilang reel pa ang umiikot
  const targetRef = useRef<Brief>(EMPTY); // ang magiging laman pagkatapos ng spin
  const bags = useRef<Record<Key, Set<string>>>({
    brand: new Set(),
    category: new Set(),
    mood: new Set(),
  });

  const reels = useMemo(
    () => REEL_DEFS.filter((r) => extras || !r.extra),
    [extras],
  );
  const allLocked = reels.every((r) => lock[r.key]);

  // Ang brief na ipinapakita: kung naka-off ang Extra reels, hindi kasama ang mood.
  const shown: Brief = extras ? pick : { ...pick, mood: null };
  const current = isComplete(shown) ? shown : null;
  const sentence = current ? briefSentence(current) : "";
  const search = current ? toSearch(current) : "";
  const isSaved = current ? savedApi.has(current) : false;

  function spin(forced?: Partial<Record<Key, string>>) {
    if (spinning) return;
    if (!forced && allLocked) return;

    const id = spinId + 1;
    const nextPick: Brief = { ...pick };
    const fresh: Partial<Record<Key, Plan>> = {};

    for (const r of reels) {
      if (!forced && lock[r.key]) continue;
      const list = items[r.key];
      const value =
        forced?.[r.key] ?? drawFromBag(list, bags.current[r.key], pick[r.key]);
      nextPick[r.key] = value;
      fresh[r.key] = makePlan(list, value, id);
    }

    targetRef.current = nextPick;
    pending.current = Object.keys(fresh).length;

    setPlans((p) => ({ ...p, ...fresh }));
    setSpinId(id);
    setCopied(null);
    setSpinning(true);
    if (soundOn) sfx.spin();
  }

  function handleStop() {
    if (soundOn) sfx.stop();
    pending.current -= 1;
    if (pending.current > 0) return;

    const final = targetRef.current;
    setPick(final);
    setHistory((h) => [final, ...h].slice(0, HISTORY_MAX));
    setSpinning(false);
    if (soundOn) sfx.done();
  }

  // Parehong brief para sa lahat ng tao sa araw na ito (seeded sa petsa). Hindi kasama ang sarili mong entries.
  function dailyBrief() {
    const day = todayKey();
    const forced: Partial<Record<Key, string>> = {};
    for (const r of reels) {
      forced[r.key] = seededPick(BUILTIN_ITEMS[r.key], `${day}:${r.key}`);
    }
    setLock(NO_LOCKS);
    spin(forced);
  }

  async function copy(kind: "brief" | "link") {
    if (!current) return;
    const text =
      kind === "brief"
        ? sentence
        : `${window.location.origin}${window.location.pathname}?${search}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  function toggleSound() {
    if (!soundOn) sfx.tick(); // pinapakinggan agad, at ina-unlock ang audio sa user click
    setSoundOn((v) => !v);
  }

  function save() {
    if (current) savedApi.add(current);
  }

  // Nagbukas gamit ang link na may mood: i-on ang Extra reels para makita.
  useEffect(() => {
    if (fromLink && fromLink.mood) setExtras(true);
  }, [fromLink, setExtras]);

  // Laging naka-sync ang URL sa kasalukuyang brief, kaya pwedeng i-copy ang address bar.
  useEffect(() => {
    if (!search) return;
    try {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${search}`,
      );
    } catch {
      /* hal. sandboxed iframe: okay lang, may "Copy link" pa rin */
    }
  }, [search]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  // Isang listener lang, pero laging ang pinakabagong spin() ang tinatawag.
  const spinRef = useRef(spin);
  useEffect(() => {
    spinRef.current = spin;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        spinRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="page">
      <Header spinning={spinning} spinCount={spinId} />

      <h1 className="title">
        Spin for your
        <br />
        next website.
      </h1>

      <section className="machine" aria-label="Roulette reels">
        {reels.map((r) => (
          <Reel
            key={r.key}
            label={r.label}
            items={items[r.key]}
            value={pick[r.key]}
            plan={plans[r.key] ?? null}
            delay={r.delay}
            locked={lock[r.key]}
            busy={spinning}
            long={r.long}
            compact={r.extra}
            onLock={() => setLock((l) => ({ ...l, [r.key]: !l[r.key] }))}
            onStop={handleStop}
          />
        ))}
      </section>

      <div className="controls">
        <button
          type="button"
          className="spin"
          onClick={() => spin()}
          disabled={spinning || allLocked}
        >
          <span>
            {allLocked
              ? "Unlock a reel to spin"
              : spinning
                ? "Spinning"
                : "Spin"}
          </span>
          <span className="key">Space</span>
        </button>
        <p className="hint">
          Lock a reel to keep its value while the others spin.
        </p>

        <div className="toggles">
          <button
            type="button"
            className="lock chip"
            aria-pressed={extras}
            onClick={() => setExtras((v) => !v)}
            disabled={spinning}
          >
            Extra reels{" "}
            <small aria-hidden="true">{extras ? "on" : "off"}</small>
          </button>
          <button
            type="button"
            className="lock chip"
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            Sound <small aria-hidden="true">{soundOn ? "on" : "off"}</small>
          </button>
          <button
            type="button"
            className="lock chip"
            onClick={dailyBrief}
            disabled={spinning}
          >
            Today&apos;s brief
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {current && (
          <section className="result">
            <p className="result-label">Your brief</p>
            <div className="result-row">
              <p
                className={`brief${sentence.length > 70 ? " brief-long" : ""}`}
              >
                Build <strong>{current.brand}</strong>,{" "}
                {article(current.category)} <strong>{current.category}</strong>{" "}
                website.
                {current.mood && (
                  <>
                    {" "}
                    Mood: <strong>{current.mood}</strong>.
                  </>
                )}
              </p>

              <div className="result-actions">
                <button
                  type="button"
                  className="copy"
                  onClick={() => copy("brief")}
                >
                  {copied === "brief" ? "Copied" : "Copy brief"}
                </button>
                <button
                  type="button"
                  className="copy"
                  onClick={() => copy("link")}
                >
                  {copied === "link" ? "Link copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className="copy"
                  onClick={save}
                  disabled={isSaved}
                >
                  {isSaved ? "Saved" : "Save brief"}
                </button>
              </div>
            </div>

            <CategoryNote name={current.category} />
          </section>
        )}
      </div>

      {history.length > 1 && (
        <section className="history">
          <p className="result-label">Earlier spins</p>
          <ul>
            {history.slice(1).map((h, i) => (
              <li key={i}>
                {[h.brand, h.category, extras ? h.mood : null]
                  .filter((x): x is string => x !== null)
                  .join(" × ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {savedApi.saved.length > 0 && (
        <SavedBriefs
          saved={savedApi.saved}
          onToggle={savedApi.toggleDone}
          onRemove={savedApi.remove}
        />
      )}

      <footer className="footer">
        <span>Made for indecisive developers.</span>
        <span>
          © {new Date().getFullYear()}{" "}
          <a
            href="https://snowi-cambronero.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            snowi
          </a>
        </span>
      </footer>
    </main>
  );
}
