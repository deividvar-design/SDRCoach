"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { SAMPLE_CALL } from "@/content/sample-call";

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(MOTION_QUERY).matches, () => false);
}

/**
 * The hero's call stage: a scripted Level 3 call on an ink panel. Turns land on their timestamps, the waveform
 * moves while the prospect speaks, and the scorecard fills in at the end. With `audioSrc` set the transcript
 * follows the audio clock instead of the wall clock.
 */
export function SampleCall({ autoStart = false }: { autoStart?: boolean }) {
  const { prospect, rep, turns, endsAt, result, audioSrc } = SAMPLE_CALL;
  const [playing, setPlaying] = useState(false);
  const [clock, setClock] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(0);
  const startedAt = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!playing) return;
    startedAt.current = performance.now() - clock;
    const tick = () => {
      const now = audio.current ? audio.current.currentTime * 1000 : performance.now() - startedAt.current;
      setClock(now);
      if (now >= endsAt) {
        setPlaying(false);
        setDone(true);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [clock]);

  // Picks up by itself once in view, after the entrance settles, unless motion is reduced or the viewer clicked first.
  const cardRef = useRef<HTMLDivElement>(null);
  const autoFired = useRef(false);
  const interacted = useRef(false);
  useEffect(() => {
    if (!autoStart || !cardRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = cardRef.current;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || autoFired.current) return;
        autoFired.current = true;
        timer = window.setTimeout(() => {
          if (interacted.current) return;
          setPlaying(true);
          audio.current?.play().catch(() => {});
        }, 1400);
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [autoStart]);

  function start() {
    interacted.current = true;
    if (done) {
      setDone(false);
      setClock(0);
    }
    if (reduced && !audioSrc) {
      setClock(endsAt);
      setDone(true);
      return;
    }
    setPlaying(true);
    audio.current?.play().catch(() => {});
  }
  function pause() {
    interacted.current = true;
    setPlaying(false);
    audio.current?.pause();
  }
  function reset() {
    interacted.current = true;
    pause();
    setClock(0);
    setDone(false);
    if (audio.current) audio.current.currentTime = 0;
  }

  // Never an empty card: before play the first exchange is already there, dimmed. Reduced motion shows the whole call.
  const visible = reduced ? turns : clock === 0 && !playing ? turns.slice(0, 2) : turns.filter((t) => t.t <= clock);
  const current = visible.at(-1);
  const prospectSpeaking = playing && current?.role === "prospect";
  const repSpeaking = playing && current?.role === "rep";
  const started = clock > 0 || playing;
  const idle = !started && !done;
  const firstName = prospect.name.split(" ")[0];

  return (
    <div ref={cardRef} className="stage text-background relative overflow-hidden rounded-3xl">
      {audioSrc && <audio ref={audio} src={audioSrc} preload="none" />}

      {/* Header: who is on the line, the dial counter, and a timer you can read from across the room */}
      <div className="grid gap-5 px-6 pt-6 md:grid-cols-[1fr_auto] md:items-end md:px-8 md:pt-8">
        <div className="flex items-center gap-4">
          <div className="relative grid place-items-center">
            {prospectSpeaking && <span className="bg-signal/40 ring-speaking absolute size-16 rounded-full" />}
            <div className={cn("bg-background text-foreground relative grid size-14 place-items-center rounded-full font-medium transition-transform", prospectSpeaking && "scale-105")}>RL</div>
          </div>
          <div>
            <div className="font-display text-2xl leading-tight">{prospect.name}</div>
            <div className="text-background/60 text-sm">{prospect.title}, {prospect.company}</div>
            <div className="dial text-background/60 mt-1 text-[11px]">LEVEL 03 · COLD · DIAL 037/100</div>
          </div>
        </div>
        <div className="flex items-baseline gap-3 md:justify-end">
          <span className={cn("dial text-xs", playing ? "text-signal" : "text-background/50")}>
            {playing && <span className="bg-signal mr-2 inline-block size-1.5 rounded-full live-pulse align-middle" />}
            {playing ? "LIVE" : done ? "ENDED" : "READY"}
          </span>
          <span className="dial text-5xl leading-none md:text-7xl">{formatDuration(Math.floor(clock / 1000))}</span>
        </div>
      </div>

      {/* Waveform: moves for whoever is talking, flat when nobody is */}
      <div className="mt-6 flex h-12 items-center gap-[3px] px-6 md:px-8" aria-hidden>
        {Array.from({ length: 96 }, (_, i) => (
          <span
            key={i}
            className={cn("wave-bar w-1 rounded-full", prospectSpeaking ? "bg-signal" : repSpeaking ? "bg-background/70" : "bg-background/20")}
            style={{ "--i": i, "--h": `${10 + ((i * 7) % 22)}px`, height: prospectSpeaking || repSpeaking ? undefined : "3px", animationPlayState: prospectSpeaking || repSpeaking ? "running" : "paused" } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Body: transcript, then the scorecard */}
      <div className="mt-4 border-t border-white/10">
        {!done ? (
          <div ref={listRef} className={cn("h-[320px] space-y-3 overflow-y-auto px-6 py-5 md:px-8", idle && "opacity-60")}>
            {visible.map((t, i) => (
              <div key={i} className={cn("line-in max-w-[80%]", t.role === "rep" ? "ml-auto" : "")}>
                <div className={cn("text-[10px] uppercase tracking-wider", t.role === "rep" ? "text-background/50 text-right" : "text-signal")}>{t.role === "rep" ? rep : firstName}</div>
                <p className={cn("mt-1 rounded-2xl px-4 py-2.5 text-sm leading-relaxed", t.role === "rep" ? "bg-background text-foreground rounded-tr-sm" : "bg-white/10 rounded-tl-sm")}>{t.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="line-in h-[320px] overflow-y-auto px-6 py-5 md:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-background/60 text-xs">Coach's score</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-6xl leading-none">{result.overall.toFixed(1)}</span>
                  <span className="text-background/60">/ 10</span>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-success/20 text-success rounded-full px-2.5 py-1 text-xs font-medium">{result.outcome}</span>
                <div className="text-background/60 mt-1.5 max-w-[16rem] text-xs italic">“{result.outcomeReason}”</div>
              </div>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {result.dimensions.map(([label, score], i) => (
                <div key={label}>
                  <div className="flex justify-between text-xs">
                    <dt className="text-background/80">{label}</dt>
                    <dd className="font-mono tabular">{score.toFixed(1)}</dd>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="score-fill bg-signal h-full rounded-r-[4px]" style={{ "--w": `${score * 10}%`, "--i": i } as React.CSSProperties} />
                  </div>
                </div>
              ))}
            </dl>
            <p className="text-background/80 mt-5 text-sm leading-relaxed">{result.coach}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 md:px-8">
        <p className="text-background/50 text-xs">{done ? "Reviewed and scored." : started ? (prospectSpeaking ? `${firstName} is speaking` : `${rep} is speaking`) : "A scripted Level 3 call, as text. Yours talk back."}</p>
        <div className="flex gap-1.5">
          {started && !playing && (
            <button type="button" onClick={reset} aria-label="Restart" className="text-background/70 hover:text-background grid size-9 cursor-pointer place-items-center rounded-full hover:bg-white/10"><RotateCcw className="size-4" /></button>
          )}
          {playing ? (
            <button type="button" onClick={pause} aria-label="Pause" className="bg-background text-foreground grid size-9 cursor-pointer place-items-center rounded-full"><Pause className="size-4" /></button>
          ) : (
            <button type="button" onClick={start} aria-label={done ? "Play again" : "Play the example call"} className="bg-signal text-signal-foreground grid size-9 cursor-pointer place-items-center rounded-full"><Play className="size-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}
