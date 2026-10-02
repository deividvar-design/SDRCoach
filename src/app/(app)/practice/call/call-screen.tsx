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
import { startAmbience, type AmbienceHandle } from "@/lib/audio/ambience";
import type { Ambience } from "@/lib/domain/moods";
import { stripVoiceTags } from "@/lib/elevenlabs/tags";

interface TargetCard {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string | null;
  persona_notes: string | null;
  kind: "real" | "practice" | "boss";
}

interface Props {
  target: TargetCard;
  difficulty: Difficulty;
  level: LevelSpec;
  voiceConfigured: boolean;
}

type Stage = "idle" | "dialing" | "live" | "ending" | "error";

interface LiveTurn {
  role: "rep" | "prospect";
  speaker?: "gatekeeper";
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

function CallScreenInner({ target, difficulty, level, voiceConfigured }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [trialBlocked, setTrialBlocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [silentMic, setSilentMic] = useState(false);
  const [gatekeeperName, setGatekeeperName] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const startedRef = useRef<Promise<unknown> | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const ambienceRef = useRef<AmbienceHandle | null>(null);
  const pendingAmbienceRef = useRef<Ambience>("quiet");
  const gatekeeperRef = useRef<{ name: string; voiceLabel: string } | null>(null);
  const stopAmbience = () => {
    ambienceRef.current?.stop();
    ambienceRef.current = null;
  };
  const releaseMic = () => {
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  };
  const transcriptRef = useRef<HTMLDivElement>(null);

  const endOnServer = useCallback(async () => {
    if (endedRef.current || !sessionIdRef.current) return;
    endedRef.current = true;
    // /start may still be in flight when a call drops immediately; let it land so the conversation is linked.
    await startedRef.current?.catch(() => {});
    await fetch(`/api/calls/${sessionIdRef.current}/end`, { method: "POST" }).catch(() => {});
  }, []);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      setStage("live");
      ambienceRef.current = startAmbience(pendingAmbienceRef.current);
      if (sessionIdRef.current) {
        startedRef.current = fetch(`/api/calls/${sessionIdRef.current}/start`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId }),
        }).catch(() => {});
      }
    },
    onMessage: ({ message, role }) => {
      const gk = gatekeeperRef.current;
      const text = stripVoiceTags(message);
      if (!text) return;
      // A voice-tagged agent line is the gatekeeper speaking.
      const spoke = role === "agent" && gk && new RegExp(`<${gk.voiceLabel}>`).test(message) ? "gatekeeper" : undefined;
      setTurns((prev) => [...prev, { role: role === "agent" ? "prospect" : "rep", ...(spoke ? { speaker: spoke } : {}), text }]);
    },
    onDisconnect: () => {
      track("call_ended", { difficulty });
      releaseMic();
      stopAmbience();
      setStage((s) => (s === "live" || s === "dialing" ? "ending" : s));
      endOnServer().then(() => {
        if (sessionIdRef.current) router.push(`/sessions/${sessionIdRef.current}?fresh=1`);
      });
    },
    onError: (message) => {
      setError(message);
      setStage("error");
      releaseMic();
      stopAmbience();
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

  // Mic meter. If the SDK hears nothing from the rep for the first eight seconds, say so: a muted headset or the wrong
  // input device looks exactly like a prospect who ignores you.
  useEffect(() => {
    if (stage !== "live") return;
    let peak = 0;
    const start = Date.now();
    const id = setInterval(() => {
      const v = conversation.isMuted ? 0 : conversation.getInputVolume();
      peak = Math.max(peak, v);
      setMicLevel(v);
      if (!conversation.isMuted && Date.now() - start > 8000) setSilentMic(peak < 0.03);
    }, 120);
    return () => {
      clearInterval(id);
      // Reset on the way out of the live stage, not on the way in.
      setMicLevel(0);
      setSilentMic(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // A fresh dial is a fresh session: forget the previous one so its hang-up flag cannot swallow this call's /end.
    sessionIdRef.current = null;
    endedRef.current = false;
    startedRef.current = null;
    setTurns([]);
    setElapsed(0);
    setError(null);
    setStage("dialing");
    let stopRing: (() => void) | null = null;
    try {
      // The SDK acquires its own microphone track. Pre-flight only when permission is not already granted, so a
      // rep who chose "allow this time" in Chrome is asked once per call, not twice.
      const granted = await navigator.permissions?.query({ name: "microphone" as PermissionName }).then((p) => p.state === "granted").catch(() => false);
      if (!granted) micRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      // So the "review is ready" notice can reach a backgrounded tab. Browsers only ever ask once.
      if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => {});
      const ctx = new AudioContext();
      stopRing = playRingback(ctx, 2);

      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: target.id, difficulty }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setTrialBlocked(true);
        throw new Error(data.error ?? "Trial limit reached");
      }
      if (!res.ok) throw new Error(data.error ?? "Could not start the call");
      sessionIdRef.current = data.sessionId;
      pendingAmbienceRef.current = data.ambience ?? "quiet";
      gatekeeperRef.current = data.gatekeeper ?? null;
      setGatekeeperName(data.gatekeeper?.name ?? null);
      track("call_started", { difficulty, target_kind: target.kind, gatekeeper: Boolean(data.gatekeeper) });

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
            {target.kind === "boss" && <Badge variant="destructive">Boss fight</Badge>}
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
          {(stage === "live" || stage === "ending") && (
            <div className="bg-background/80 mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 dial text-sm" aria-live="off">
              {stage === "live" ? (
                <>
                  <span className="bg-signal size-2 rounded-full live-pulse" />
                  <span className="text-signal font-medium">LIVE</span>
                </>
              ) : (
                <span className="text-muted-foreground">Ended</span>
              )}
              <span>{formatDuration(elapsed)}</span>
            </div>
          )}

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
                <MicMeter level={micLevel} muted={conversation.isMuted} />
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

          {stage === "live" && silentMic && !conversation.isMuted && (
            <p className="text-destructive mt-6 max-w-sm text-sm text-balance" role="status">
              The prospect can't hear you. Check the mic icon in your browser's address bar for which microphone is in use, and that your headset isn't muted.
            </p>
          )}

          {stage === "idle" && (
            <p className="text-muted-foreground mt-8 max-w-sm text-xs text-balance">
              Headset on. The prospect picks up as soon as it connects. They decide how the call ends, so treat it like a real dial.
            </p>
          )}
        </section>

        {/* Sidebar: research + live transcript */}
        <aside className="flex flex-col gap-4">
          <div className="bg-card rounded-2xl border p-5">
            <div className="text-muted-foreground mb-2 text-xs">Your research</div>
            <p className="text-sm">
              {target.name} is {target.title} at {target.company}
              {target.industry ? ` (${target.industry})` : ""}.
            </p>
            {target.persona_notes && <p className="text-muted-foreground mt-2 text-sm">{target.persona_notes}</p>}
            <p className="text-muted-foreground mt-3 text-xs">{level.description}</p>
          </div>

          <div className="bg-card flex min-h-[260px] flex-1 flex-col rounded-2xl border">
            <div className="text-muted-foreground border-b px-5 py-3 text-xs">Live transcript</div>
            <div ref={transcriptRef} className="max-h-[420px] flex-1 space-y-3 overflow-y-auto p-5">
              {turns.length === 0 ? (
                <p className="text-muted-foreground text-sm">Words appear here as you both speak.</p>
              ) : (
                turns.map((t, i) => (
                  <div key={i} className={cn("text-sm", t.role === "rep" ? "text-foreground" : "text-muted-foreground")} data-speaker={t.speaker}>
                    <span className="mr-2 text-[11px]">{t.role === "rep" ? "You" : t.speaker === "gatekeeper" ? gatekeeperName ?? "Gatekeeper" : target.name.split(" ")[0]}</span>
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

/** Eight bars that follow the rep's input level, so "is it hearing me" has a visible answer. */
function MicMeter({ level, muted }: { level: number; muted: boolean }) {
  const lit = muted ? 0 : Math.min(8, Math.round(Math.sqrt(Math.min(1, level * 4)) * 8));
  return (
    <div className="flex h-11 items-end gap-0.5" aria-label={muted ? "Microphone muted" : `Microphone level ${Math.round((lit / 8) * 100)}%`} title="Your mic">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={cn("w-1 rounded-sm transition-colors duration-100", i < lit ? "bg-signal" : "bg-border")} style={{ height: `${8 + i * 3}px` }} />
      ))}
    </div>
  );
}
