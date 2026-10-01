// Sound effects: mga .wav file sa public/sounds/ (tick, spin, stop, done).
// Ang mga file sa `public/` ay available sa "/sounds/<name>.wav".
// Kung iba ang base path ng deploy mo, palitan ang BASE sa ibaba.

const BASE = "/sounds/";

function play(name: string, volume = 0.5) {
  try {
    const audio = new Audio(`${BASE}${name}.wav`);
    audio.volume = volume;
    // Ma-reject ito kapag naka-block ang autoplay o kulang ang file. Okay lang, tahimik lang.
    void audio.play().catch(() => {});
  } catch {
    /* walang audio support */
  }
}

export const sfx = {
  tick: () => play("tick"),
  spin: () => play("spin", 0.4),
  stop: () => play("stop", 0.6),
  done: () => play("done", 0.6),
};
