/**
 * The ringing a caller hears until the other side picks up: a double ring (0.4 s on, 0.2 s off, 0.4 s on, 2 s off),
 * so there is never a long silence before the answer. It keeps ringing until stopped, which the call screens do the
 * moment the prospect connects, with a short fade instead of a click. Generated with the Web Audio API.
 */
export function startRingback(maxSeconds = 60): () => void {
  if (typeof AudioContext === "undefined") return () => {};
  const ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ctx.destination);
  const oscs = [400, 450].map((f) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    o.connect(gain);
    return o;
  });
  const t0 = ctx.currentTime + 0.05;
  const LEVEL = 0.07;
  for (let c = 0; c * 3 < maxSeconds; c++) {
    for (const on of [c * 3, c * 3 + 0.6]) {
      const t = t0 + on;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(LEVEL, t + 0.02);
      gain.gain.setValueAtTime(LEVEL, t + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    }
  }
  oscs.forEach((o) => o.start(t0));
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    oscs.forEach((o) => {
      try {
        o.stop(t + 0.1);
      } catch {}
    });
    setTimeout(() => ctx.close().catch(() => {}), 200);
  };
}
