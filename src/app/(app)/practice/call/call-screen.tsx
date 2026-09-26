"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { cn, formatDuration, initials } from "@/lib/utils";
import type { LevelSpec } from "@/lib/domain/levels";
import type { Difficulty } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { track } from "@/components/analytics/provider";

interface TargetCard {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string | null;
  persona_notes: string | null;
  kind: "real" | "practice";
}

interface Props {
  target: TargetCard;
  difficulty: Difficulty;
  level: LevelSpec;
  assignmentId: string | null;
  voiceConfigured: boolean;
}

type Stage = "idle" | "dialing" | "live" | "ending" | "error";

interface LiveTurn {
  role: "rep" | "prospect";
  text: string;
}

/** Synthesised North American ringback tone (440 + 480 Hz, 2 s on / 4 s off). */
function playRingback(ctx: AudioContext, cycles: number) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.frequency.value = 440;
  oscB.frequency.value = 480;
  oscA.connect(gain);
  oscB.connect(gain);
  const t0 = ctx.currentTime;
  for (let i = 0; i < cycles; i++) {
    const on = t0 + i * 6;
    gain.gain.setValueAtTime(0.0001, on);
    gain.gain.exponentialRampToValueAtTime(0.08, on + 0.05);
    gain.gain.setValueAtTime(0.08, on + 1.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, on + 2);
  }
  oscA.start(t0);
  oscB.start(t0);
  oscA.stop(t0 + cycles * 6);
  oscB.stop(t0 + cycles * 6);
  return () => {
    try {
      oscA.stop();
      oscB.stop();
    } catch {}
  };
}

export function CallScreen(props: Props) {
  return (
    <ConversationProvider>
      <CallScreenInner {...props} />
    </ConversationProvider>
  );
}

function CallScreenInner({ target, difficulty, level, assignmentId, voiceConfigured }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [trialBlocked, setTrialBlocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const micRef = useRef<MediaStream | null>(null);
  const releaseMic = () => {
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  };
  const transcriptRef = useRef<HTMLDivElement>(null);

  const endOnServer = useCallback(async () => {
    if (endedRef.current || !sessionIdRef.current) return;
    endedRef.current = true;
    await fetch(`/api/calls/${sessionIdRef.current}/end`, { method: "POST" }).catch(() => {});
  }, []);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      setStage("live");
      if (sessionIdRef.current) {
        fetch(`/api/calls/${sessionIdRef.current}/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId }),
        }).catch(() => {});
      }
    },
    onMessage: ({ message, role }) => {
      setTurns((prev) => [...prev, { role: role === "agent" ? "prospect" : "rep", text: message }]);
    },
    onDisconnect: () => {
      track("call_ended", { difficulty });
      releaseMic();
      setStage((s) => (s === "live" || s === "dialing" ? "ending" : s));
      endOnServer().then(() => {
        if (sessionIdRef.current) router.push(`/sessions/${sessionIdRef.current}?fresh=1`);
      });
    },
    onError: (message) => {
      setError(message);
      setStage("error");
      releaseMic();
      endOnServer();
    },
  });

  // Timer
  useEffect(() => {
    if (stage !== "live") return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [stage]);

  // Keep transcript scrolled
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // Hang up if the tab closes mid-call
  useEffect(() => {
    const onHide = () => {
      if ((stage === "live" || stage === "dialing") && sessionIdRef.current && !endedRef.current) navigator.sendBeacon?.(`/api/calls/${sessionIdRef.current}/end`);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [stage]);

  async function dial() {
    setError(null);
    setStage("dialing");
    let stopRing: (() => void) | null = null;
    try {
      micRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      stopRing = playRingback(ctx, 2);

      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: target.id, difficulty, assignmentId }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setTrialBlocked(true);
        throw new Error(data.error ?? "Trial limit reached");
      }
      if (!res.ok) throw new Error(data.error ?? "Could not start the call");
      sessionIdRef.current = data.sessionId;
      track("call_started", { difficulty, target_kind: target.kind });

      // Let it ring once so it feels like a real dial.
      await new Promise((r) => setTimeout(r, 2200));
      stopRing();
      stopRing = null;
      ctx.close().catch(() => {});

      // The SDK owns its own microphone track from here on.
      releaseMic();
      conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
        overrides: {
          agent: { prompt: { prompt: data.overrides.prompt }, firstMessage: data.overrides.firstMessage, language: "en" },
          ...(data.overrides.voiceId ? { tts: { voiceId: data.overrides.voiceId } } : {}),
        },
      });
    } catch (err) {
      stopRing?.();
      releaseMic();
      const message = err instanceof Error ? err.message : "Could not start the call";
      setError(message.includes("Permission") || message.includes("NotAllowed") ? "Microphone access is required to make a call." : message);
      setStage("error");
      if (sessionIdRef.current) endOnServer();
    }
  }

  function hangUp() {
    setStage("ending");
    conversation.endSession();
  }

  const prospectSpeaking = stage === "live" && conversation.isSpeaking;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Stage */}
        <section className="bg-card paper-grain relative flex min-h-[540px] flex-col items-center justify-center overflow-hidden rounded-2xl border p-8 text-center">
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <Badge variant="secondary">L{level.level} {level.name}</Badge>
            {target.kind === "practice" && <Badge variant="outline">Practice persona</Badge>}
          </div>
          <div className="absolute top-5 right-5 font-mono text-sm tabular">
            {stage === "live" && (
              <span className="flex items-center gap-2">
                <span className="bg-signal size-2 rounded-full live-pulse" />
                <span className="text-signal font-medium">LIVE</span>
                <span>{formatDuration(elapsed)}</span>
              </span>
            )}
          </div>

          <div className="relative mb-6 grid place-items-center">
            {(stage === "dialing" || prospectSpeaking) && (
              <>
                <span className={cn("bg-signal/30 absolute size-32 rounded-full", stage === "dialing" ? "dial-ring" : "ring-speaking")} />
                {stage === "dialing" && <span className="bg-signal/20 absolute size-32 rounded-full dial-ring [animation-delay:0.8s]" />}
              </>
            )}
            <div className={cn("bg-primary text-primary-foreground relative grid size-32 place-items-center rounded-full text-3xl font-medium transition-transform", prospectSpeaking && "scale-105")}>
              {initials(target.name)}
            </div>
          </div>

          <h1 className="font-display text-4xl">{target.name}</h1>
          <p className="text-muted-foreground mt-1">
            {target.title}, {target.company}
          </p>

          <p className="text-muted-foreground mt-6 h-5 text-sm">
            {stage === "idle" && (voiceConfigured ? "Ready when you are." : "Voice service is not configured yet.")}
            {stage === "dialing" && "Ringing…"}
            {stage === "live" && (prospectSpeaking ? `${target.name.split(" ")[0]} is speaking` : "Listening to you")}
            {stage === "ending" && "Call ended. Your coach is reviewing it…"}
            {stage === "error" && (
              <span className="text-destructive">
                {error}
                {trialBlocked && (
                  <>
                    {" "}
                    <Link href="/upgrade" className="underline underline-offset-4">See plans</Link>
                  </>
                )}
              </span>
            )}
          </p>

          <div className="mt-8 flex items-center gap-3">
            {stage === "idle" || stage === "error" ? (
              <>
                <Button size="lg" variant="signal" onClick={dial} disabled={!voiceConfigured}>
                  <Mic /> {stage === "error" ? "Try again" : "Dial"}
                </Button>
                <Button size="lg" variant="ghost" asChild>
                  <Link href="/practice">Back</Link>
                </Button>
              </>
            ) : stage === "live" ? (
              <>
                <Button size="icon-lg" variant="outline" onClick={() => conversation.setMuted(!conversation.isMuted)} aria-label={conversation.isMuted ? "Unmute" : "Mute"}>
                  {conversation.isMuted ? <MicOff /> : <Mic />}
                </Button>
                <Button size="icon-lg" variant="destructive" onClick={hangUp} aria-label="Hang up">
                  <PhoneOff />
                </Button>
              </>
            ) : (
              <Button size="lg" variant="outline" disabled>
                {stage === "dialing" ? "Connecting…" : "Wrapping up…"}
              </Button>
            )}
          </div>

          {stage === "idle" && (
            <p className="text-muted-foreground mt-8 max-w-sm text-xs text-balance">
              Headset on. The prospect picks up as soon as it connects. They decide how the call ends, so treat it like a real dial.
            </p>
          )}
        </section>

        {/* Sidebar: research + live transcript */}
        <aside className="flex flex-col gap-4">
          <div className="bg-card rounded-2xl border p-5">
            <div className="text-muted-foreground mb-2 font-mono text-[11px] tracking-[0.14em] uppercase">Your research</div>
            <p className="text-sm">
              {target.name} is {target.title} at {target.company}
              {target.industry ? ` (${target.industry})` : ""}.
            </p>
            {target.persona_notes && <p className="text-muted-foreground mt-2 text-sm">{target.persona_notes}</p>}
            <p className="text-muted-foreground mt-3 text-xs">{level.description}</p>
          </div>

          <div className="bg-card flex min-h-[260px] flex-1 flex-col rounded-2xl border">
            <div className="text-muted-foreground border-b px-5 py-3 font-mono text-[11px] tracking-[0.14em] uppercase">Live transcript</div>
            <div ref={transcriptRef} className="max-h-[420px] flex-1 space-y-3 overflow-y-auto p-5">
              {turns.length === 0 ? (
                <p className="text-muted-foreground text-sm">Words appear here as you both speak.</p>
              ) : (
                turns.map((t, i) => (
                  <div key={i} className={cn("text-sm", t.role === "rep" ? "text-foreground" : "text-muted-foreground")}>
                    <span className="mr-2 font-mono text-[10px] tracking-wider uppercase">{t.role === "rep" ? "You" : target.name.split(" ")[0]}</span>
                    {t.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
