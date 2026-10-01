// One gesture-unlocked context; decoded files are reused across every spin.
const BASE = `${import.meta.env.BASE_URL}sounds/`;
type Sound = "tick" | "spin" | "stop" | "done";
let context: AudioContext | null = null;
let enabled = false;
let generation = 0;
const buffers = new Map<Sound, Promise<AudioBuffer>>();
const playing = new Set<AudioBufferSourceNode>();

function load(name: Sound, ctx: AudioContext) {
  let buffer = buffers.get(name);
  if (!buffer) {
    buffer = fetch(`${BASE}${name}.wav`)
      .then((response) => {
        if (!response.ok) throw new Error("Sound unavailable");
        return response.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .catch((error: unknown) => {
        buffers.delete(name);
        throw error;
      });
    buffers.set(name, buffer);
  }
  return buffer;
}

function silence() {
  generation += 1;
  playing.forEach((source) => {
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
  });
  playing.clear();
  if (context && context.state !== "closed") void context.suspend().catch(() => {});
}

function unlock() {
  if (!enabled || document.hidden) return;
  try {
    const AudioContextClass = window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    context ??= new AudioContextClass();
    // Resume inside the click/keydown, before fetching files.
    if (context.state !== "running") void context.resume().catch(() => {});
    for (const name of ["tick", "spin", "stop", "done"] as const) {
      void load(name, context).catch(() => {});
    }
  } catch { /* Audio is optional, including in restrictive webviews. */ }
}

async function play(name: Sound, volume: number) {
  const ctx = context;
  if (!enabled || !ctx || document.hidden) return;
  const version = generation;
  const started = performance.now();
  try {
    const buffer = await load(name, ctx);
    // Never replay stale effects after muting, switching apps, or a slow download.
    if (!enabled || document.hidden || version !== generation ||
        ctx.state !== "running" || performance.now() - started > 1000) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    playing.add(source);
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  } catch { /* Missing files, blocked playback, and offline mode stay silent. */ }
}

export const sfx = {
  setEnabled(value: boolean) {
    enabled = value;
    if (!value) silence();
  },
  unlock,
  silence,
  tick: () => { void play("tick", 0.5); },
  spin: () => { void play("spin", 0.4); },
  stop: () => { void play("stop", 0.6); },
  done: () => { void play("done", 0.6); },
};
