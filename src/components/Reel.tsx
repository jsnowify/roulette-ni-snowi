import { useCallback, useEffect, useRef, useState } from "react";
import type { TransitionEvent } from "react";
import { around } from "../lib/random";
import type { Plan } from "../types";

type ReelProps = {
  label: string;
  items: readonly string[];
  /** Ang kasalukuyang laman ng reel. `null` = bagong bukas, wala pang laman. */
  value: string | null;
  plan: Plan | null;
  delay: number;
  locked: boolean;
  busy: boolean;
  long?: boolean;
  compact?: boolean;
  onLock: () => void;
  onStop: () => void;
};

export default function Reel({
  label,
  items,
  value,
  plan,
  delay,
  locked,
  busy,
  long,
  compact,
  onLock,
  onStop,
}: ReelProps) {
  const [strip, setStrip] = useState<string[]>(() => around(items, value));
  const [run, setRun] = useState(false);
  // Naka-initialize sa kasalukuyang plan: kapag nag-mount ulit ang reel (hal. nag-on ng
  // Extra reels), hindi nito ipe-play ang lumang plan.
  const [seen, setSeen] = useState(() => plan?.id ?? 0);
  const doneFor = useRef(plan?.id ?? 0);

  // Laging ang pinakabagong onStop ang tinatawag, kahit galing sa timeout.
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  });

  // May bagong plan: i-reset ang strip habang nagre-render (hindi kailangan ng effect).
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

  const finish = useCallback((id: number) => {
    if (doneFor.current === id) return;
    doneFor.current = id;
    setRun(false);
    setStrip((s) => s.slice(-3)); // iwanan ang 3 row na nakikita, para walang "pop"
    onStopRef.current();
  }, []);

  // Simulan ang slide pagkatapos ng isang paint para na-commit muna ang reset sa itaas.
  // Ang timeout ay safety net (hal. background tab) para hindi ma-stuck ang spin.
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
  }, [plan, delay, finish]);

  function handleEnd(e: TransitionEvent<HTMLDivElement>) {
    if (!run || !plan || e.target !== e.currentTarget) return;
    finish(plan.id);
  }

  const y = run ? -(strip.length - 3) : 0;
  const timing = { transitionDuration: run ? `${1900 + delay}ms` : "0ms" };

  const rows = strip.map((text, i) => (
    <div className={`item${long ? " item-long" : ""}`} key={i}>
      {text}
    </div>
  ));

  return (
    <div className={`reel${compact ? " reel-compact" : ""}`} data-run={run}>
      <div className="reel-head">
        <span>
          {label} <small>{String(items.length).padStart(3, "0")} entries</small>
        </span>
        <button
          type="button"
          className="lock"
          aria-label={`Lock ${label}`}
          aria-pressed={locked}
          onClick={onLock}
          disabled={busy || value === null}
        >
          {locked ? "Locked" : "Lock"}
        </button>
      </div>

      <div className="window" aria-hidden="true">
        <div
          className="strip"
          onTransitionEnd={handleEnd}
          style={{
            ...timing,
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
              ...timing,
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
