import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import PokeButton from "./PokeButton";

// Header ball: one shared loop so the roll (rotate) always matches the travel (left).
const loop = {
  duration: 9,
  ease: "easeInOut",
  repeat: Infinity,
  repeatType: "reverse",
  repeatDelay: 0.6,
} as const;

type HeaderProps = {
  spinning: boolean;
  spinCount: number;
};

export default function Header({ spinning, spinCount }: HeaderProps) {
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
      animate(trackRef.current, { x: ["0%", "100%"] }, loop),
      animate(ballRef.current, { rotate: [0, 900] }, loop),
    ];
    rollRef.current = run;
    const onVisibility = () => {
      run.forEach((control) =>
        document.hidden ? control.pause() : control.play(),
      );
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      run.forEach((c) => c.stop());
      rollRef.current = [];
    };
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

  function look(e: ReactPointerEvent<HTMLElement>) {
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

  return (
    <motion.header
      className="top"
      onHoverStart={hoverStart}
      onHoverEnd={hoverEnd}
      onPointerMove={look}
    >
      {!reduceMotion && (
        <span className={`roller${hover ? " is-flat" : ""}`} aria-hidden="true">
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

      <a className="logo" href={import.meta.env.BASE_URL}>
        Roulette ni snowi
      </a>
      <div className="top-right">
        <p className="status" role="status">
          status: {spinning ? "spinning" : "ready"} / spins:{" "}
          {String(spinCount).padStart(3, "0")}
        </p>
        <PokeButton />
      </div>
    </motion.header>
  );
}
