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

export function startAmbience(kind: Ambience): AmbienceHandle | null {
  if (kind === "quiet" || typeof AudioContext === "undefined") return null;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const stops: (() => void)[] = [];
  const sources: AudioBufferSourceNode[] = [];

  switch (kind) {
    case "office": {
      // Air handling hum and a faint room tone, with the odd distant sound.
      sources.push(loopNoise(ctx, master, { lowpass: 220, gain: 0.5 }));
      sources.push(loopNoise(ctx, master, { lowpass: 3000, highpass: 800, gain: 0.05 }));
      stops.push(bursts(ctx, master, { every: [9, 25], lowpass: 1200, gain: 0.08 }));
      break;
    }
    case "car": {
      // Road rumble that swells and fades, plus tyre hiss.
      const rumble = loopNoise(ctx, master, { lowpass: 120, gain: 1.1 });
      sources.push(rumble);
      const hiss = ctx.createGain();
      hiss.gain.value = 1;
      hiss.connect(master);
      sources.push(loopNoise(ctx, hiss, { lowpass: 2500, highpass: 400, gain: 0.09 }));
      stops.push(wander(ctx, hiss.gain, 1, 0.5, 3));
      break;
    }
    case "street": {
      sources.push(loopNoise(ctx, master, { lowpass: 400, gain: 0.45 }));
      sources.push(loopNoise(ctx, master, { lowpass: 5000, highpass: 1000, gain: 0.07 }));
      stops.push(bursts(ctx, master, { every: [4, 12], lowpass: 900, gain: 0.35 }));
      break;
    }
    case "home": {
      sources.push(loopNoise(ctx, master, { lowpass: 160, gain: 0.3 }));
      stops.push(bursts(ctx, master, { every: [12, 40], lowpass: 2000, gain: 0.12 }));
      break;
    }
  }

  // Fade in over two seconds; the overall bed sits around -30 dB under the voice.
  master.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 2);

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
