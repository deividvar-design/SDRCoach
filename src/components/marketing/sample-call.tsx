"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { SAMPLE_CALL } from "@/content/sample-call";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Plays a scripted Level 3 call: turns appear on their timestamps, the prospect "speaks", and the
 * score lands at the end. When `audioSrc` is set the transcript follows the audio clock instead.
 */
export function SampleCall({ autoStart = false }: { autoStart?: boolean }) {
  const { prospect, turns, endsAt, result, audioSrc } = SAMPLE_CALL;
  const [playing, setPlaying] = useState(false);
  const [clock, setClock] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(0);
  const startedAt = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // The hero picks up by itself: once the card is in view, after the entrance settles, unless motion is reduced.
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
        }, 1200);
        io.disconnect();
      },
      { threshold: 0.6 },
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

  const visible = turns.filter((t) => t.t <= clock);
  const current = visible.at(-1);
  const prospectSpeaking = playing && current?.role === "prospect";
  const started = clock > 0 || playing;

  return (
    <div ref={cardRef} className="bg-card overflow-hidden rounded-2xl border shadow-xl">
      {audioSrc && <audio ref={audio} src={audioSrc} preload="none" />}
      <div className="grid md:grid-cols-[300px_1fr]">
        <div className="paper-grain flex flex-col items-center justify-center border-b p-8 text-center md:border-r md:border-b-0">
          <div className="relative mb-4 grid place-items-center">
            {prospectSpeaking && <span className="bg-signal/30 ring-speaking absolute size-24 rounded-full" />}
            <div className={cn("bg-primary text-primary-foreground relative grid size-24 place-items-center rounded-full text-2xl font-medium transition-transform", prospectSpeaking && "scale-105")}>RL</div>
          </div>
          <div className="font-display text-2xl">{prospect.name}</div>
          <div className="text-muted-foreground text-sm">{prospect.title}, {prospect.company}</div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary">Level 3, Cold</Badge>
            {playing && (
              <span className="text-signal flex items-center gap-1.5 font-mono text-xs">
                <span className="bg-signal size-1.5 rounded-full live-pulse" /> LIVE
              </span>
            )}
          </div>
          <div className="mt-5 font-mono text-2xl tabular">{formatDuration(Math.floor(clock / 1000))}</div>
          <div className="mt-5 flex gap-2">
            {playing ? (
              <Button size="icon-lg" variant="outline" onClick={pause} aria-label="Pause"><Pause /></Button>
            ) : (
              <Button size="icon-lg" variant="signal" onClick={start} aria-label={done ? "Play again" : "Play the example call"}>
                <Play />
              </Button>
            )}
            {started && (
              <Button size="icon-lg" variant="ghost" onClick={reset} aria-label="Restart"><RotateCcw /></Button>
            )}
          </div>
          <p className="text-muted-foreground mt-4 text-xs">{done ? "Reviewed and scored." : started ? (prospectSpeaking ? "Rebecca is speaking" : "Sam is speaking") : "Watch a rep take on a Level 3 prospect"}</p>
        </div>

        <div className="flex min-h-[380px] flex-col">
          {!done ? (
            <div ref={listRef} className="max-h-[420px] flex-1 space-y-4 overflow-y-auto p-6">
              {visible.length === 0 && <p className="text-muted-foreground text-sm">Press play. The prospect picks up.</p>}
              {visible.map((t, i) => (
                <div key={i} className={cn("animate-in fade-in slide-in-from-bottom-1 duration-300", t.role === "prospect" && "pl-5")}>
                  <div className="text-muted-foreground mb-1 text-[11px]">{t.role === "rep" ? "Sam" : "Rebecca"}</div>
                  <p className={cn("text-sm leading-relaxed", t.role === "prospect" && "text-muted-foreground")}>{t.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in flex-1 p-6 duration-500">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-muted-foreground text-xs">Overall</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-success font-mono text-6xl font-medium tabular">{result.overall.toFixed(1)}</span>
                    <span className="text-muted-foreground">/ 10</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="success">{result.outcome}</Badge>
                  <div className="text-muted-foreground mt-1 max-w-xs text-xs italic">“{result.outcomeReason}”</div>
                </div>
              </div>
              <p className="font-display mt-5 text-lg leading-snug">{result.coach}</p>
              <dl className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {result.dimensions.map(([label, score]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs">
                      <dt>{label}</dt>
                      <dd className="font-mono tabular">{score.toFixed(1)}</dd>
                    </div>
                    <div className="bg-muted mt-1 h-1 overflow-hidden rounded-full">
                      <div className="bg-foreground h-full rounded-r-[4px]" style={{ width: `${score * 10}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
