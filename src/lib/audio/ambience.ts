import type { Ambience } from "@/lib/domain/moods";

/**
 * Background sound beds, generated with the Web Audio API so there are no files to license or load.
 * Kept well under the voice: the point is a sense of place, not noise.
 */
export interface AmbienceHandle {
  stop: () => void;
}

function noiseBuffer(ctx: AudioContext, seconds = 4, pink = true) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (!pink) {
      data[i] = white;
      continue;
    }
    // Paul Kellet's pink noise approximation.
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buf;
}

function loopNoise(ctx: AudioContext, out: AudioNode, { lowpass, highpass, gain }: { lowpass: number; highpass?: number; gain: number }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = lowpass;
  let chain: AudioNode = lp;
  src.connect(lp);
  if (highpass) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;
    lp.connect(hp);
    chain = hp;
  }
  const g = ctx.createGain();
  g.gain.value = gain;
  chain.connect(g);
  g.connect(out);
  src.start();
  return src;
}

/** Slow random swells so the bed breathes instead of humming at one level. */
function wander(ctx: AudioContext, param: AudioParam, base: number, depth: number, period: number) {
  let alive = true;
  const step = () => {
    if (!alive) return;
    const next = base * (1 - depth + Math.random() * depth * 2);
    param.linearRampToValueAtTime(next, ctx.currentTime + period);
    setTimeout(step, period * 1000);
  };
  step();
  return () => {
    alive = false;
  };
}

/** Occasional short filtered bursts: a passing car, a door, a distant voice. */
function bursts(ctx: AudioContext, out: AudioNode, { every, lowpass, gain }: { every: [number, number]; lowpass: number; gain: number }) {
  let alive = true;
  let timer = 0;
  const one = () => {
    if (!alive) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 2, true);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lowpass;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const len = 0.8 + Math.random() * 1.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + len * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start(t);
    src.stop(t + len + 0.1);
    timer = window.setTimeout(one, (every[0] + Math.random() * (every[1] - every[0])) * 1000);
  };
  timer = window.setTimeout(one, every[0] * 1000);
  return () => {
    alive = false;
    clearTimeout(timer);
  };
}

/** Runs `fn` now and then, every `range` seconds, until stopped. The first one waits `first` seconds. */
function every(range: [number, number], fn: () => void, first = range[0]) {
  let alive = true;
  let timer = 0;
  const loop = () => {
    if (!alive) return;
    fn();
    timer = window.setTimeout(loop, (range[0] + Math.random() * (range[1] - range[0])) * 1000);
  };
  timer = window.setTimeout(loop, first * 1000);
  return () => {
    alive = false;
    clearTimeout(timer);
  };
}

/** A short filtered noise hit: a key press, a footstep, a tick. */
function hit(ctx: AudioContext, out: AudioNode, t: number, { freq, q = 1, gain, len = 0.02, type = "bandpass" }: { freq: number; q?: number; gain: number; len?: number; type?: BiquadFilterType }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.2, false);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(t + len + 0.05);
}

/** A tone with an envelope: the building block for rings, chimes, clinks and horns. */
function tone(ctx: AudioContext, out: AudioNode, t: number, { freq, len, gain, type = "sine", attack = 0.01, lowpass }: { freq: number; len: number; gain: number; type?: OscillatorType; attack?: number; lowpass?: number }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  let node: AudioNode = osc;
  if (lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lowpass;
    osc.connect(lp);
    node = lp;
  }
  node.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + len + 0.05);
}

/** The car's indicator: a run of tick-tocks. */
const indicator = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  const n = 6 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) {
    hit(ctx, out, t + i * 0.8, { freq: 2600, q: 6, gain, len: 0.03 });
    hit(ctx, out, t + i * 0.8 + 0.4, { freq: 1900, q: 6, gain: gain * 0.8, len: 0.03 });
  }
};

/** Another vehicle going past: a band of noise that rises and falls in pitch and volume. */
const passBy = (ctx: AudioContext, out: AudioNode, gain: number, [lo, hi] = [2, 4]) => () => {
  const t = ctx.currentTime;
  const len = lo + Math.random() * (hi - lo);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, len + 0.2, true);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(250, t);
  bp.frequency.linearRampToValueAtTime(900, t + len * 0.5);
  bp.frequency.linearRampToValueAtTime(220, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + len * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(t + len + 0.1);
};

/** A distant siren: a wailing tone that swells in and fades away. */
const siren = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  const len = 7 + Math.random() * 3;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(700, t);
  for (let s = 0; s < len; s += 1.4) {
    osc.frequency.linearRampToValueAtTime(980, t + s + 0.7);
    osc.frequency.linearRampToValueAtTime(700, t + s + 1.4);
  }
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + len * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(lp);
  lp.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + len + 0.1);
};

/** A short car horn somewhere down the road. */
const horn = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  const len = 0.25 + Math.random() * 0.35;
  tone(ctx, out, t, { freq: 420, len, gain, type: "sawtooth", attack: 0.02, lowpass: 1300 });
  tone(ctx, out, t, { freq: 520, len, gain: gain * 0.8, type: "sawtooth", attack: 0.02, lowpass: 1300 });
};

/** Someone typing nearby: a burst of key presses at an uneven pace. */
const typing = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  let t = ctx.currentTime;
  const n = 6 + Math.floor(Math.random() * 16);
  for (let i = 0; i < n; i++) {
    t += 0.07 + Math.random() * 0.13;
    hit(ctx, out, t, { freq: 3200 + Math.random() * 1500, q: 2, gain: gain * (0.6 + Math.random() * 0.4), len: 0.025 });
  }
};

/** A desk phone ringing across the room, twice. */
const phoneRing = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  for (const start of [0, 0.6, 3, 3.6]) {
    tone(ctx, out, t + start, { freq: 440, len: 0.4, gain, attack: 0.02, lowpass: 1100 });
    tone(ctx, out, t + start, { freq: 480, len: 0.4, gain, attack: 0.02, lowpass: 1100 });
  }
};

/** A cup or a spoon against china. */
const clink = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  const base = 2200 + Math.random() * 1400;
  tone(ctx, out, t, { freq: base, len: 0.35, gain, attack: 0.002 });
  tone(ctx, out, t, { freq: base * 1.48, len: 0.25, gain: gain * 0.5, attack: 0.002 });
  if (Math.random() < 0.5) tone(ctx, out, t + 0.18, { freq: base * 1.1, len: 0.25, gain: gain * 0.7, attack: 0.002 });
};

/** The espresso machine: a couple of seconds of steam. */
const steam = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  const len = 1.8 + Math.random() * 1.5;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, len + 0.2, false);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.15);
  g.gain.setValueAtTime(gain, t + len - 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(t + len + 0.1);
};

/** The station chime, then a few seconds of a muffled announcement. */
const announcement = (ctx: AudioContext, out: AudioNode, gain: number) => () => {
  const t = ctx.currentTime;
  [784, 659, 523].forEach((f, i) => tone(ctx, out, t + i * 0.45, { freq: f, len: 0.9, gain, attack: 0.01 }));
  const len = 3.5;
  const start = t + 1.7;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, len + 0.2, true);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 700;
  bp.Q.value = 1.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  for (let s = 0; s < len; s += 0.22) g.gain.linearRampToValueAtTime(gain * (0.3 + Math.random() * 0.7), start + s);
  g.gain.linearRampToValueAtTime(0.0001, start + len);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  src.start(start);
  src.stop(start + len + 0.1);
};

/** People talking around you: a band of noise that never sits still. */
function murmur(ctx: AudioContext, out: AudioNode, gain: number, stops: (() => void)[], sources: AudioBufferSourceNode[]) {
  const g = ctx.createGain();
  g.gain.value = 1;
  g.connect(out);
  sources.push(loopNoise(ctx, g, { lowpass: 1800, highpass: 250, gain }));
  stops.push(wander(ctx, g.gain, 1, 0.45, 1.2));
}

/** Overall level per place: a café and a station are louder than an office, always well under the voice. */
// Set from measured output in Chrome: about 12 to 18 dB under a voice at -18 dBFS, like a real phone line.
// Office and home near -34 dBFS RMS, car, street, cafe and station near -30. The first levels sat near -50: inaudible.
const LEVEL: Record<Exclude<Ambience, "quiet">, number> = { office: 0.27, open_office: 0.29, car: 0.2, street: 0.43, home: 0.36, cafe: 0.4, station: 0.28 };

export function startAmbience(kind: Ambience): AmbienceHandle | null {
  if (kind === "quiet" || typeof AudioContext === "undefined") return null;
  const ctx = new AudioContext();
  // Created when the prospect picks up, not on the click: some browsers (Safari) start such a context paused.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const stops: (() => void)[] = [];
  const sources: AudioBufferSourceNode[] = [];

  switch (kind) {
    case "office": {
      // Air handling, room tone, colleagues talking down the corridor, someone typing, a phone now and then.
      sources.push(loopNoise(ctx, master, { lowpass: 220, gain: 0.5 }));
      sources.push(loopNoise(ctx, master, { lowpass: 3000, highpass: 800, gain: 0.08 }));
      murmur(ctx, master, 0.15, stops, sources);
      stops.push(every([4, 10], typing(ctx, master, 0.6), 2));
      stops.push(every([30, 60], phoneRing(ctx, master, 0.22), 15));
      break;
    }
    case "open_office": {
      sources.push(loopNoise(ctx, master, { lowpass: 220, gain: 0.45 }));
      murmur(ctx, master, 0.35, stops, sources);
      stops.push(every([3, 9], typing(ctx, master, 0.55), 2));
      stops.push(every([25, 50], phoneRing(ctx, master, 0.2), 12));
      break;
    }
    case "car": {
      // Road rumble and tyre hiss, other cars going past, the indicator, the odd horn.
      sources.push(loopNoise(ctx, master, { lowpass: 120, gain: 1.1 }));
      const hiss = ctx.createGain();
      hiss.gain.value = 1;
      hiss.connect(master);
      sources.push(loopNoise(ctx, hiss, { lowpass: 2500, highpass: 400, gain: 0.09 }));
      stops.push(wander(ctx, hiss.gain, 1, 0.5, 3));
      stops.push(every([6, 14], passBy(ctx, master, 0.7), 5));
      stops.push(every([25, 55], indicator(ctx, master, 0.9), 15));
      stops.push(every([40, 90], horn(ctx, master, 0.25), 30));
      break;
    }
    case "street": {
      // City traffic bed, cars and buses going by, horns, a siren in the distance.
      sources.push(loopNoise(ctx, master, { lowpass: 400, gain: 0.45 }));
      sources.push(loopNoise(ctx, master, { lowpass: 5000, highpass: 1000, gain: 0.06 }));
      stops.push(every([3, 8], passBy(ctx, master, 0.9, [1.5, 3.5]), 2));
      stops.push(every([20, 45], horn(ctx, master, 0.3), 10));
      stops.push(every([45, 90], siren(ctx, master, 0.35), 25));
      break;
    }
    case "home": {
      sources.push(loopNoise(ctx, master, { lowpass: 160, gain: 0.3 }));
      stops.push(bursts(ctx, master, { every: [12, 40], lowpass: 2000, gain: 0.12 }));
      break;
    }
    case "cafe": {
      // Chatter, cups and spoons, the espresso machine.
      sources.push(loopNoise(ctx, master, { lowpass: 300, gain: 0.3 }));
      murmur(ctx, master, 0.55, stops, sources);
      stops.push(every([3, 8], clink(ctx, master, 0.25), 2));
      stops.push(every([25, 50], steam(ctx, master, 0.35), 10));
      break;
    }
    case "station": {
      // Hall echo and crowd, a train rolling through, the chime and an announcement.
      sources.push(loopNoise(ctx, master, { lowpass: 200, gain: 0.6 }));
      murmur(ctx, master, 0.4, stops, sources);
      stops.push(every([30, 60], announcement(ctx, master, 0.3), 12));
      stops.push(every([50, 100], passBy(ctx, master, 0.8, [6, 9]), 35));
      break;
    }
  }

  // Fade in over two seconds; the bed sits well under the voice.
  master.gain.exponentialRampToValueAtTime(LEVEL[kind], ctx.currentTime + 2);


  return {
    stop: () => {
      stops.forEach((s) => s());
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => {
        sources.forEach((s) => {
          try {
            s.stop();
          } catch {}
        });
        ctx.close().catch(() => {});
      }, 700);
    },
  };
}
