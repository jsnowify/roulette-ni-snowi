import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Shared poke counter (free public service, works from any device).
const POKE_API = "https://abacus.jasoncameron.dev";
const POKE_PATH = "roulette-ni-snowi/pokes";
// Pinakamaikling pagitan ng dalawang poke. Para hindi ma-spam ang libreng API.
const COOLDOWN_MS = 200;

type Burst = {
  id: number;
  n: number;
  bits: { x: number; y: number; r: number }[];
};

export default function PokeButton() {
  const reduceMotion = useReducedMotion();
  const [pokes, setPokes] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [pops, setPops] = useState<{ id: number; dx: number }[]>([]);
  const [burst, setBurst] = useState<Burst | null>(null);
  const nextId = useRef(0);
  const lastPoke = useRef(0);

  useEffect(() => {
    const ctrl = new AbortController();

    fetch(`${POKE_API}/get/${POKE_PATH}`, { signal: ctrl.signal })
      .then((r) => (r.status === 404 ? { value: 0 } : r.json()))
      .then((d) => setPokes((p) => Math.max(p ?? 0, Number(d.value) || 0)))
      .catch((e) => {
        if (e.name !== "AbortError") setOnline(false);
      });

    return () => ctrl.abort();
  }, []);

  function celebrate(n: number) {
    const id = (nextId.current += 1);
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

  function poke() {
    const now = Date.now();
    if (now - lastPoke.current < COOLDOWN_MS) return;
    lastPoke.current = now;

    const id = (nextId.current += 1);
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
        setOnline(true);
        setPokes((p) => Math.max(p ?? 0, Number(d.value) || 0));
      })
      .catch(() => setOnline(false));
  }

  return (
    <div className="poke-wrap">
      <button type="button" className="poke" onClick={poke}>
        Poke Snowi: {pokes === null ? "…" : pokes.toLocaleString()}
      </button>

      {pops.map((p) => (
        <span
          key={p.id}
          className="pop"
          style={{ "--dx": `${p.dx}px` } as CSSProperties}
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
          <span className="burst-label">{burst.n.toLocaleString()} pokes!</span>
        </span>
      )}

      {!online && <span className="poke-note">counter offline</span>}
    </div>
  );
}
