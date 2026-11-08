/**
 * The tone a phone line plays when the other side hangs up: three short beeps. Generated with the Web Audio API,
 * like the ringback and the background beds. Resolves when the beeps have finished.
 */
export function playHangupTone(): Promise<void> {
  if (typeof AudioContext === "undefined") return Promise.resolve();
  const ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.frequency.value = 425;
  osc.connect(gain);
  const t0 = ctx.currentTime + 0.05;
  const BEEP = 0.22;
  const GAP = 0.2;
  for (let i = 0; i < 3; i++) {
    const on = t0 + i * (BEEP + GAP);
    gain.gain.setValueAtTime(0.0001, on);
    gain.gain.exponentialRampToValueAtTime(0.18, on + 0.01);
    gain.gain.setValueAtTime(0.18, on + BEEP - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, on + BEEP);
  }
  const end = t0 + 3 * (BEEP + GAP);
  osc.start(t0);
  osc.stop(end);
  return new Promise((resolve) => {
    osc.onended = () => {
      ctx.close().catch(() => {});
      resolve();
    };
    // Belt and braces: never hold the caller up if the audio never plays.
    setTimeout(resolve, (end - ctx.currentTime) * 1000 + 300);
  });
}
