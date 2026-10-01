import Lenis from "lenis";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

const brands = [
  "Hoshi",
  "Aven",
  "Mori",
  "Solen",
  "Veya",
  "Kovo",
  "Orin",
  "Miro",
  "Aster",
  "Runa",
  "Elio",
  "Vero",
  "Sova",
  "Kori",
  "Nami",
  "Onda",
  "Talo",
  "Mave",
  "Aro",
  "Sumi",
  "Vela",
  "Nero",
  "Kiyo",
  "Rove",
  "Oro",
  "Meya",
  "Tova",
  "Sero",
  "Arlo",
  "Lune",
  "Kova",
  "Nori",
  "Vano",
  "Eira",
  "Omi",
  "Sano",
  "Rilo",
  "Yori",
  "Maro",
  "Kano",
  "Aveno",
  "Sorai",
  "Velin",
  "Moro",
  "Kivo",
  "Orra",
  "Savi",
  "Tero",
  "Nilo",
  "Auri",
  "Vori",
  "Mysa",
  "Kero",
  "Silo",
  "Rumi",
  "Ovie",
  "Tavi",
  "Mirae",
  "Yuna",
  "Reno",
  "Alto",
  "Naro",
  "Sori",
  "Kumi",
  "Arven",
  "Ollo",
  "Mero",
  "Tori",
  "Sena",
  "Vilo",
  "Neya",
  "Kuro",
  "Riva",
  "Ossa",
  "Muna",
  "Teno",
  "Vara",
  "Selo",
  "Aroha",
  "Movo",
  "Karo",
  "Niva",
  "Sora",
  "Veroa",
  "Orvi",
  "Teya",
  "Melo",
  "Kina",
  "Rovo",
  "Aira",
  "Suno",
  "Vana",
  "Oroa",
  "Nelo",
  "Toma",
  "Raya",
  "Kivoa",
  "Mova",
  "Siro",
] as const;

const categories = [
  "Architecture",
  "Art & Illustration",
  "Business & Corporate",
  "Culture & Education",
  "Design Agencies",
  "E-Commerce",
  "Events",
  "Experimental",
  "Fashion",
  "Film & TV",
  "Food & Drink",
  "Games & Entertainment",
  "Hotel / Restaurant",
  "Institutions",
  "Luxury",
  "Magazine / Newspaper / Blog",
  "Music & Sound",
  "Photography",
  "Promotional",
  "Real Estate",
  "Social Responsibility",
  "Sports",
  "Startups",
  "Technology",
  "Web & Interactive",
] as const;

type Key = "brand" | "category";
type Pick = Record<Key, string>;
type Saved = Pick & { done: boolean };
type Plan = { id: number; fillers: string[]; value: string; post: string };

const FILLERS = 16;

// Header ball: one shared loop so the roll (rotate) always matches the travel (left).
const loop = {
  duration: 9,
  ease: "easeInOut",
  repeat: Infinity,
  repeatType: "reverse",
  repeatDelay: 0.6,
} as const;

// Shared poke counter (free public service, works from any device).
const POKE_API = "https://abacus.jasoncameron.dev";
const POKE_PATH = "roulette-ni-snowi/pokes";
const START: Pick = { brand: "Hoshi", category: "Design Agencies" };

const REELS: {
  key: Key;
  label: string;
  items: readonly string[];
  delay: number;
  long?: boolean;
}[] = [
  { key: "brand", label: "Brand", items: brands, delay: 0 },
  {
    key: "category",
    label: "Category",
    items: categories,
    delay: 550,
    long: true,
  },
];

const SAVE_KEY = "roulette-ni-snowi:saved";

function loadSaved(): Saved[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

const sameBrief = (a: Pick, b: Pick) =>
  a.brand === b.brand && a.category === b.category;

const rand = (list: readonly string[]) =>
  list[Math.floor(Math.random() * list.length)]!;

function nextItem(list: readonly string[], current: string) {
  if (list.length < 2) return list[0]!;
  let item = current;
  while (item === current) item = rand(list);
  return item;
}

function around(list: readonly string[], value: string) {
  const i = list.indexOf(value);
  return [
    list[(i - 1 + list.length) % list.length]!,
    value,
    list[(i + 1) % list.length]!,
  ];
}

const makePlan = (
  list: readonly string[],
  value: string,
  id: number,
): Plan => ({
  id,
  value,
  fillers: Array.from({ length: FILLERS }, () => rand(list)),
  post: rand(list),
});

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
const brief = (p: Pick) =>
  `Build ${p.brand}, ${article(p.category)} ${p.category} website.`;

type ReelProps = {
  label: string;
  items: readonly string[];
  initial: string;
  plan: Plan | null;
  delay: number;
  locked: boolean;
  busy: boolean;
  long?: boolean;
  onLock: () => void;
  onStop: () => void;
};

function Reel({
  label,
  items,
  initial,
  plan,
  delay,
  locked,
  busy,
  long,
  onLock,
  onStop,
}: ReelProps) {
  const [strip, setStrip] = useState<string[]>(() => around(items, initial));
  const [run, setRun] = useState(false);
  const [seen, setSeen] = useState(0);

  // A new plan arrived: reset the strip during render (no effect needed).
  if (plan && plan.id !== seen) {
    setSeen(plan.id);
    setRun(false);
    setStrip((s) => [
      s[0]!,
      s[1]!,
      s[2]!,
      ...plan.fillers,
      plan.value,
      plan.post,
    ]);
  }

  const doneFor = useRef(0);

  function finish(id: number) {
    if (doneFor.current === id) return;
    doneFor.current = id;
    setRun(false);
    setStrip((s) => s.slice(-3)); // keep the rows that are on screen, so nothing pops
    onStop();
  }

  // Start the slide one paint later so the reset above is committed first.
  // The timeout is a safety net (e.g. background tab) so a spin can never get stuck.
  useEffect(() => {
    if (!plan) return;

    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (doneFor.current !== plan.id) setRun(true);
      });
    });
    const safety = window.setTimeout(() => finish(plan.id), 1900 + delay + 800);

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  function handleEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (!run || !plan || e.target !== e.currentTarget) return;
    finish(plan.id);
  }

  const y = run ? -(strip.length - 3) : 0;
  const motion = { transitionDuration: run ? `${1900 + delay}ms` : "0ms" };

  const rows = strip.map((text, i) => (
    <div className={`item${long ? " item-long" : ""}`} key={i}>
      {text}
    </div>
  ));

  return (
    <div className="reel" data-run={run}>
      <div className="reel-head">
        <span>
          {label} <small>{String(items.length).padStart(3, "0")} entries</small>
        </span>
        <button
          type="button"
          className="lock"
          aria-pressed={locked}
          onClick={onLock}
          disabled={busy}
        >
          {locked ? "Locked" : "Lock"}
        </button>
      </div>

      <div className="window" aria-hidden="true">
        <div
          className="strip"
          onTransitionEnd={handleEnd}
          style={{
            ...motion,
            transform: `translateY(calc(var(--row) * ${y}))`,
          }}
        >
          {rows}
        </div>

        {/* Same strip again, clipped to the centre row: whatever passes through turns black. */}
        <div className="band">
          <div
            className="strip"
            style={{
              ...motion,
              transform: `translateY(calc(var(--row) * ${y - 1}))`,
            }}
          >
            {rows}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [pick, setPick] = useState<Pick>(START);
  const [plans, setPlans] = useState<Partial<Record<Key, Plan>>>({});
  const [lock, setLock] = useState<Record<Key, boolean>>({
    brand: false,
    category: false,
  });
  const [saved, setSaved] = useState<Saved[]>(loadSaved);
  const [burst, setBurst] = useState<{
    id: number;
    n: number;
    bits: { x: number; y: number; r: number }[];
  } | null>(null);
  const [spinId, setSpinId] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Pick[]>([]);

  const reduceMotion = useReducedMotion();

  // Header ball: rolls along the line, squashes flat on hover, grows an eye after 2s.
  const [hover, setHover] = useState(false);
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef(0);
  const trackRef = useRef<HTMLSpanElement>(null);
  const ballRef = useRef<HTMLSpanElement>(null);
  const eyeRef = useRef<HTMLSpanElement>(null);
  const rollRef = useRef<
    { pause: () => void; play: () => void; stop: () => void }[]
  >([]);
  const lookX = useSpring(0, { stiffness: 260, damping: 22 });
  const lookY = useSpring(0, { stiffness: 260, damping: 22 });

  useEffect(() => {
    if (!trackRef.current || !ballRef.current) return;

    const run = [
      animate(trackRef.current, { left: ["0%", "100%"] }, loop),
      animate(ballRef.current, { rotate: [0, 900] }, loop),
    ];
    rollRef.current = run;

    return () => run.forEach((c) => c.stop());
  }, [reduceMotion]);

  useEffect(() => () => window.clearTimeout(peekTimer.current), []);

  function hoverStart() {
    setHover(true);
    rollRef.current.forEach((c) => c.pause());
    peekTimer.current = window.setTimeout(() => setPeek(true), 2000);
  }

  function hoverEnd() {
    window.clearTimeout(peekTimer.current);
    setHover(false);
    setPeek(false);
    rollRef.current.forEach((c) => c.play());
  }

  function look(e: React.PointerEvent<HTMLElement>) {
    const el = eyeRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(5, Math.hypot(dx, dy) / 12);

    lookX.set(Math.cos(angle) * dist);
    lookY.set(Math.sin(angle) * dist);
  }
  const [pokes, setPokes] = useState<number | null>(null);
  const [pokeOk, setPokeOk] = useState(true);
  const [pops, setPops] = useState<{ id: number; dx: number }[]>([]);
  const popId = useRef(0);

  const pending = useRef(0);
  const targetRef = useRef<Pick>(START);

  const allLocked = REELS.every((r) => lock[r.key]);
  const isSaved = saved.some((x) => sameBrief(x, pick));

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    } catch {
      /* storage unavailable: saved briefs just won't persist */
    }
  }, [saved]);

  function spin() {
    if (spinning || allLocked) return;

    const id = spinId + 1;
    const nextPick = { ...pick };
    const fresh: Partial<Record<Key, Plan>> = {};

    for (const r of REELS) {
      if (lock[r.key]) continue;
      const value = nextItem(r.items, pick[r.key]);
      nextPick[r.key] = value;
      fresh[r.key] = makePlan(r.items, value, id);
    }

    targetRef.current = nextPick;
    pending.current = Object.keys(fresh).length;

    setPlans((p) => ({ ...p, ...fresh }));
    setSpinId(id);
    setCopied(false);
    setSpinning(true);
  }

  function handleStop() {
    pending.current -= 1;
    if (pending.current > 0) return;

    setPick(targetRef.current);
    setHistory((h) => [targetRef.current, ...h].slice(0, 7));
    setSpinning(false);
  }

  function celebrate(n: number) {
    const id = (popId.current += 1);
    const bits = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 40;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        r: Math.round(Math.random() * 360 - 180),
      };
    });
    setBurst({ id, n, bits });
    window.setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), 1400);
  }

  function save() {
    if (!isSaved) setSaved((list) => [{ ...pick, done: false }, ...list]);
  }

  function toggleDone(i: number) {
    setSaved((list) =>
      list.map((x, j) => (j === i ? { ...x, done: !x.done } : x)),
    );
  }

  function removeSaved(i: number) {
    setSaved((list) => list.filter((_, j) => j !== i));
  }

  function poke() {
    const id = (popId.current += 1);
    setPops((p) => [...p, { id, dx: Math.round(Math.random() * 60 - 30) }]);
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 800);
    const count = (pokes ?? 0) + 1;
    if (!reduceMotion && count % 100 === 0) celebrate(count);
    setPokes((p) => Math.max(p ?? 0, count));

    fetch(`${POKE_API}/hit/${POKE_PATH}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        setPokeOk(true);
        setPokes((p) => Math.max(p ?? 0, Number(d.value) || 0));
      })
      .catch(() => setPokeOk(false));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(brief(pick));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy brief:", error);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();

    fetch(`${POKE_API}/get/${POKE_PATH}`, { signal: ctrl.signal })
      .then((r) => (r.status === 404 ? { value: 0 } : r.json()))
      .then((d) => setPokes((p) => Math.max(p ?? 0, Number(d.value) || 0)))
      .catch((e) => {
        if (e.name !== "AbortError") setPokeOk(false);
      });

    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        spin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <main className="page">
      <motion.header
        className="top"
        onHoverStart={hoverStart}
        onHoverEnd={hoverEnd}
        onPointerMove={look}
      >
        {!reduceMotion && (
          <span
            className={`roller${hover ? " is-flat" : ""}`}
            aria-hidden="true"
          >
            <span className="roller-track" ref={trackRef}>
              <motion.span
                className="roller-squash"
                animate={
                  hover
                    ? {
                        scaleX: 1.7,
                        scaleY: 0.2,
                        transition: { duration: 0.16, ease: "easeOut" },
                      }
                    : {
                        scaleX: 1,
                        scaleY: 1,
                        transition: {
                          type: "spring",
                          stiffness: 380,
                          damping: 7,
                        },
                      }
                }
              >
                <span className="roller-ball" ref={ballRef} />
              </motion.span>

              <AnimatePresence>
                {peek && (
                  <motion.span
                    key="eye"
                    ref={eyeRef}
                    className="eye"
                    initial={{ scaleX: 0.5, scaleY: 0 }}
                    animate={{
                      scaleX: 1,
                      scaleY: 1,
                      transition: {
                        type: "spring",
                        stiffness: 320,
                        damping: 14,
                      },
                    }}
                    exit={{
                      scaleX: 0.5,
                      scaleY: 0,
                      transition: { duration: 0.15 },
                    }}
                  >
                    <motion.span
                      className="eye-lid"
                      animate={{ scaleY: [1, 1, 0.1, 1] }}
                      transition={{
                        duration: 3.4,
                        repeat: Infinity,
                        times: [0, 0.9, 0.95, 1],
                      }}
                    >
                      <motion.span
                        className="eye-pupil"
                        style={{ x: lookX, y: lookY }}
                      />
                    </motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>
        )}

        <a className="logo" href="/">
          Roulette ni snowi
        </a>
        <div className="top-right">
          <p className="status">
            status: {spinning ? "spinning" : "ready"} / spins:{" "}
            {String(spinId).padStart(3, "0")}
          </p>

          <div className="poke-wrap">
            <button type="button" className="poke" onClick={poke}>
              Poke Snowi: {pokes === null ? "…" : pokes.toLocaleString()}
            </button>

            {pops.map((p) => (
              <span
                key={p.id}
                className="pop"
                style={{ "--dx": `${p.dx}px` } as React.CSSProperties}
                aria-hidden="true"
              >
                poke!
              </span>
            ))}

            {burst && (
              <span className="burst" key={burst.id} aria-hidden="true">
                {burst.bits.map((b, i) => (
                  <motion.i
                    key={i}
                    className="bit"
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{
                      x: b.x,
                      y: b.y,
                      opacity: 0,
                      rotate: b.r,
                      scale: 0.5,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                ))}
                <span className="burst-label">
                  {burst.n.toLocaleString()} pokes!
                </span>
              </span>
            )}

            {!pokeOk && <span className="poke-note">counter offline</span>}
          </div>
        </div>
      </motion.header>

      <h1 className="title">
        Spin for your
        <br />
        next website.
      </h1>

      <section className="machine" aria-label="Roulette reels">
        {REELS.map((r) => (
          <Reel
            key={r.key}
            label={r.label}
            items={r.items}
            initial={START[r.key]}
            plan={plans[r.key] ?? null}
            delay={r.delay}
            locked={lock[r.key]}
            busy={spinning}
            long={r.long}
            onLock={() => setLock((l) => ({ ...l, [r.key]: !l[r.key] }))}
            onStop={handleStop}
          />
        ))}
      </section>

      <div className="controls">
        <button
          type="button"
          className="spin"
          onClick={spin}
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
          Lock a reel to keep its value while the other spins.
        </p>
      </div>

      <section className="result" aria-live="polite">
        <p className="result-label">Your brief</p>
        <div className="result-row">
          <p className="brief">
            Build <strong>{pick.brand}</strong>, {article(pick.category)}{" "}
            <strong>{pick.category}</strong> website.
          </p>

          <div className="result-actions">
            <button type="button" className="copy" onClick={copy}>
              {copied ? "Copied" : "Copy brief"}
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
      </section>

      {history.length > 1 && (
        <section className="history">
          <p className="result-label">Earlier spins</p>
          <ul>
            {history.slice(1).map((h, i) => (
              <li key={i}>
                {h.brand} × {h.category}
              </li>
            ))}
          </ul>
        </section>
      )}

      {saved.length > 0 && (
        <section className="saved">
          <p className="result-label">
            Saved briefs: {saved.filter((x) => x.done).length} built /{" "}
            {saved.length}
          </p>
          <ul>
            {saved.map((x, i) => (
              <li
                key={`${x.brand}|${x.category}`}
                className={x.done ? "is-done" : ""}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={x.done}
                    onChange={() => toggleDone(i)}
                  />
                  <span>
                    Build {x.brand}, {article(x.category)} {x.category} website.
                  </span>
                </label>
                <button
                  type="button"
                  className="remove"
                  onClick={() => removeSaved(i)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
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
