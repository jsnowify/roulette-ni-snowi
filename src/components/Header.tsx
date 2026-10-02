import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import PokeButton from "./PokeButton";

// Header ball: one shared loop so the roll matches the travel.
const loop = {
  duration: 9,
  ease: "easeInOut",
  repeat: Infinity,
  repeatType: "reverse",
  repeatDelay: 0.6,
} as const;

type HeaderProps = {
  spinning: boolean;
  stage: 'ready' | 'assigned' | 'building' | 'finished';
};

export default function Header({ spinning, stage }: HeaderProps) {
  const reduceMotion = useReducedMotion();

  // Keep the eye open while hovering; restore the rolling ball on pointer leave.
  const [hover, setHover] = useState(false);
  const [peek, setPeek] = useState(false);
  const peekedRef = useRef(false);
  const peekTimer = useRef(0);
  const railRef = useRef<HTMLSpanElement>(null);
  const progress = useMotionValue(0);
  const distance = useMotionValue(0);
  const travel = useTransform([progress, distance], ([p, d]) => Number(p) * Number(d));
  const rotation = useTransform(progress, [0, 1], [0, 900]);
  const eyeRef = useRef<HTMLSpanElement>(null);
  const rollRef = useRef<
    { pause: () => void; play: () => void; stop: () => void }[]
  >([]);
  const lookX = useSpring(0, { stiffness: 260, damping: 22 });
  const lookY = useSpring(0, { stiffness: 260, damping: 22 });

  useEffect(() => {
    if (reduceMotion || !peek) return;
    const look = (event: PointerEvent) => {
      const eye = eyeRef.current;
      if (!eye || event.pointerType === 'touch') return;
      const rect = eye.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const angle = Math.atan2(dy, dx);
      const amount = Math.min(5, Math.hypot(dx, dy) / 12);
      lookX.set(Math.cos(angle) * amount);
      lookY.set(Math.sin(angle) * amount);
    };
    window.addEventListener('pointermove', look);
    return () => window.removeEventListener('pointermove', look);
  }, [peek, reduceMotion, lookX, lookY]);

  useEffect(() => {
    const rail = railRef.current;
    if (reduceMotion || !rail) return;

    // Leave room at both ends for the 24px eye and spring overshoot.
    const measure = () => distance.set(Math.max(0, rail.clientWidth - 38));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    progress.set(0);
    const run = [animate(progress, [0, 1], loop)];
    rollRef.current = run;
    const onVisibility = () => {
      run.forEach((control) =>
        document.hidden || peekedRef.current ? control.pause() : control.play(),
      );
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      run.forEach((c) => c.stop());
      observer.disconnect();
      rollRef.current = [];
    };
  }, [reduceMotion, progress, distance]);

  useEffect(() => () => {
    window.clearTimeout(peekTimer.current);
  }, []);

  function hoverStart() {
    if (reduceMotion) return;
    setHover(true);
    rollRef.current.forEach((c) => c.pause());
    window.clearTimeout(peekTimer.current);
    if (!peek) peekTimer.current = window.setTimeout(() => { peekedRef.current = true; setPeek(true); }, 1500);
  }

  function hoverEnd() {
    window.clearTimeout(peekTimer.current);
    setHover(false);
    setPeek(false);
    peekedRef.current = false;
    lookX.set(0);
    lookY.set(0);
    if (!document.hidden) rollRef.current.forEach((c) => c.play());
  }

  return (
    <motion.header
      className="top"
      onHoverStart={hoverStart}
      onHoverEnd={hoverEnd}
    >
      {!reduceMotion && (
        <span className={`roller${hover || peek ? " is-flat" : ""}`} ref={railRef} aria-hidden="true">
          <motion.span className="roller-track" style={{ x: travel }}>
            <motion.span
              className="roller-squash"
              animate={
                hover || peek
                  ? {
                      scaleX: 1.7,
                      scaleY: 1 / 14,
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
              <motion.span className="roller-ball" style={{ rotate: rotation }} />
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
          </motion.span>
        </span>
      )}

      <a className="logo" href={import.meta.env.BASE_URL}>
        Roulette ni snowi
      </a>
      <div className="top-right">
        <p className="status" role="status">
          {spinning ? 'Drawing your challenge' : stage === 'building' ? 'Week in progress' : stage === 'assigned' ? 'Your challenge is assigned' : stage === 'finished' ? 'Challenge complete' : 'A seven-day brand challenge'}
        </p>
        <PokeButton />
      </div>
    </motion.header>
  );
}
