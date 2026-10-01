import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Shared poke counter (free public service, works from any device).
const POKE_API = "https://abacus.jasoncameron.dev";
const POKE_PATH = "roulette-ni-snowi/pokes";
// Pinakamaikling pagitan ng dalawang poke. Para hindi ma-spam ang libreng API.
const COOLDOWN_MS = 200;
const REFRESH_MS = 10_000;

function counterValue(data: unknown): number {
  const value = data && typeof data === "object" ? (data as { value?: unknown }).value : null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid counter response");
  }
  return value;
}

type Burst = {
  id: number;
  n: number;
  bits: { x: number; y: number; r: number }[];
};

export default function PokeButton() {
  const reduceMotion = useReducedMotion();
  const [pokes, setPokes] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [hitting, setHitting] = useState(false);
  const [pops, setPops] = useState<{ id: number; dx: number }[]>([]);
  const [burst, setBurst] = useState<Burst | null>(null);
  const nextId = useRef(0);
  const lastPoke = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const timers = useRef(new Set<number>());
  const mounted = useRef(false);
  const hitPending = useRef(false);

  function later(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }

  async function readCounter(action: "get" | "hit") {
    const ctrl = new AbortController();
    requests.current.add(ctrl);
    const timeout = window.setTimeout(() => ctrl.abort(), 5000);
    try {
      const response = await fetch(`${POKE_API}/${action}/${POKE_PATH}`, { signal: ctrl.signal, cache: "no-store" });
      if (action === "get" && response.status === 404) return 0;
      if (!response.ok) throw new Error("Counter unavailable");
      return counterValue(await response.json());
    } finally {
      window.clearTimeout(timeout);
      requests.current.delete(ctrl);
    }
  }

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const controllers = requests.current;
    const scheduled = timers.current;
    let source: EventSource | null = null;
    let refreshTimer = 0;
    let refreshPending = false;
    let failures = 0;
    let streaming = false;

    function accept(value: number) {
      if (!active) return;
      setOnline(true);
      setPokes((p) => Math.max(p ?? 0, value));
    }

    function scheduleRefresh() {
      if (!active || document.hidden || streaming || refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = 0;
        void refresh();
      }, Math.min(60_000, REFRESH_MS * 2 ** Math.min(failures, 3)));
    }

    async function refresh() {
      if (!active || document.hidden || refreshPending) return;
      refreshPending = true;
      try {
        accept(await readCounter("get"));
        failures = 0;
      } catch {
        if (active && !document.hidden) {
          failures += 1;
          setOnline(false);
        }
      } finally {
        refreshPending = false;
        scheduleRefresh();
      }
    }

    function connect() {
      if (!active || document.hidden || source || typeof EventSource === "undefined") return;
      try {
        const connection = new EventSource(`${POKE_API}/stream/${POKE_PATH}`);
        source = connection;
        connection.onmessage = (event) => {
          if (!active || source !== connection || document.hidden) return;
          try {
            accept(counterValue(JSON.parse(event.data)));
            streaming = true;
            failures = 0;
            window.clearTimeout(refreshTimer);
            refreshTimer = 0;
          } catch { /* Ignore malformed messages; keep the last valid count. */ }
        };
        connection.onerror = () => {
          if (!active || source !== connection) return;
          streaming = false;
          // EventSource reconnects automatically; reads bridge stream outages.
          scheduleRefresh();
        };
      } catch { scheduleRefresh(); }
    }

    function onVisibility() {
      if (document.hidden) {
        source?.close();
        source = null;
        streaming = false;
        window.clearTimeout(refreshTimer);
        refreshTimer = 0;
      } else {
        connect();
        void refresh();
      }
    }

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      mounted.current = false;
      source?.close();
      window.clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      controllers.forEach((ctrl) => ctrl.abort());
      scheduled.forEach((timer) => window.clearTimeout(timer));
      scheduled.clear();
    };
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
    later(() => setBurst((b) => (b?.id === id ? null : b)), 1400);
  }

  function poke() {
    const now = Date.now();
    if (hitPending.current || now - lastPoke.current < COOLDOWN_MS) return;
    lastPoke.current = now;
    hitPending.current = true;
    setHitting(true);

    const id = (nextId.current += 1);
    if (!reduceMotion) {
      setPops((p) => [...p, { id, dx: Math.round(Math.random() * 60 - 30) }]);
      later(() => setPops((p) => p.filter((x) => x.id !== id)), 800);
    }

    void readCounter("hit")
      .then((value) => {
        if (!mounted.current) return;
        setOnline(true);
        setPokes((p) => Math.max(p ?? 0, value));
        if (!reduceMotion && value > 0 && value % 100 === 0) celebrate(value);
      })
      .catch(() => { if (mounted.current) setOnline(false); })
      .finally(() => {
        hitPending.current = false;
        if (mounted.current) setHitting(false);
      });
  }

  return (
    <div className="poke-wrap">
      <button type="button" className="poke" onClick={poke} disabled={hitting} aria-busy={hitting}>
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
