import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function useSmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;

    const sync = () => {
      lenis?.destroy();
      lenis = undefined;
      if (!reducedMotion.matches) {
        lenis = new Lenis({
          autoRaf: true,
          smoothWheel: true,
          lerp: 0.1,
          anchors: true,
          allowNestedScroll: true,
        });
      }
    };

    sync();
    reducedMotion.addEventListener("change", sync);
    return () => {
      reducedMotion.removeEventListener("change", sync);
      lenis?.destroy();
    };
  }, []);
}
