"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { cn, formatDuration, initials } from "@/lib/utils";
import type { LevelSpec } from "@/lib/domain/levels";
import type { Difficulty } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Rays } from "@/components/shell/brand-panel";
import { Logo } from "@/components/logo";
import { track } from "@/components/analytics/provider";
import { startAmbience, type AmbienceHandle } from "@/lib/audio/ambience";
import type { Ambience } from "@/lib/domain/moods";
import { stripVoiceTags } from "@/lib/elevenlabs/tags";
import { NO_WEB_AUDIO_MESSAGE, useWebAudioSupported } from "@/lib/audio/support";
import { MAX_CALL_SECONDS, WRAP_UP_AT_SECONDS, WRAP_UP_MESSAGE } from "@/lib/calls/limits";

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

  // Timer, with the cap: a minute before the limit the prospect is told to wrap up, so the call ends the way a real
  // one does; the hard stop a minute later only catches a prospect that would not let go.
  useEffect(() => {
    if (stage !== "live") return;
    const start = Date.now();
    let warned = false;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(secs);
      if (!warned && secs >= WRAP_UP_AT_SECONDS) {
        warned = true;
        try {
          conversation.sendContextualUpdate(WRAP_UP_MESSAGE);
        } catch {}
      }
      if (secs >= MAX_CALL_SECONDS) {
        clearInterval(id);
        setStage("ending");
        conversation.endSession();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // The call takes the whole window; the page behind it does not scroll.
  useEffect(() => {
    if (stage !== "dialing" && stage !== "live" && stage !== "ending") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage]);

  const prospectSpeaking = stage === "live" && conversation.isSpeaking;
  const audioOk = useWebAudioSupported();
  // Captions help on the warm-up and inbound levels; on the hard ones the rep works from the voice alone.
  const captions = target.kind !== "boss" && (difficulty === "warm" || difficulty === "inbound");
  const inCall = stage === "dialing" || stage === "live" || stage === "ending";
  const firstName = target.name.split(" ")[0];
  const lastTurn = turns[turns.length - 1];
  const levelLabel = target.kind === "boss" ? "Boss fight" : `L${level.level} ${level.name}`;

  if (inCall) {
    // Rendered on <body>: the page transition wrapper would otherwise hold a fixed layer inside the content column.
    return createPortal(
      // translate="no": browser page translation rewrites the DOM under React, and this screen updates every second.
      <div translate="no" role="dialog" aria-modal="true" aria-label={`Call with ${target.name}`} className="brand-panel inset-0 z-[60] flex flex-col overflow-y-auto" style={{ position: "fixed" }}>
        <Rays className="-right-[2%] -left-[2%]" height={520} />
        <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Logo inverse />
          <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold">
            <span aria-hidden className="live-pulse size-2 rounded-full bg-[#ffb162]" />
            {stage === "dialing" ? "Ringing" : stage === "ending" ? "Call ended" : "On a call · recording"}
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center px-5 pt-6 pb-16 text-center md:pt-10">
          <div className="relative grid place-items-center">
            {(stage === "dialing" || prospectSpeaking) && (
              <>
                <span className={cn("absolute size-24 rounded-full bg-[#ffb162]/30", stage === "dialing" ? "dial-ring" : "ring-speaking")} />
                {stage === "dialing" && <span className="dial-ring absolute size-24 rounded-full bg-[#ffb162]/20 [animation-delay:0.8s]" />}
              </>
            )}
            <span aria-hidden className={cn("relative grid size-24 place-items-center rounded-full border-4 border-white/20 bg-[#a35139] bg-[radial-gradient(80%_80%_at_30%_25%,#ffb162_0%,#a35139_75%)] text-2xl font-semibold text-[#1b2632] transition-transform", prospectSpeaking && "scale-105")}>
              {initials(target.name)}
            </span>
          </div>
          <h1 className="mt-[18px] text-[30px] font-semibold tracking-[-0.02em]">{target.name}</h1>
          <p className="mt-1.5 text-[15px] text-[#b9c0cb]">{target.title}, {target.company} · {levelLabel}</p>
          <p className="mt-3.5 text-[40px] leading-none font-medium tracking-[-0.02em] text-[#ffb162] tabular-nums" aria-live="off">
            {stage === "dialing" ? "0:00" : formatDuration(elapsed)}
          </p>
          {stage === "live" && MAX_CALL_SECONDS - elapsed <= 60 && <p className="mt-2 text-[13px] text-[#b9c0cb]">{formatDuration(Math.max(0, MAX_CALL_SECONDS - elapsed))} left</p>}

          <VoiceWave speaking={prospectSpeaking} mic={stage === "live" && !conversation.isMuted ? micLevel : 0} />

          {captions && stage === "live" && (
            <div className="mt-7 min-h-[96px] max-w-[680px]" aria-live="polite">
              {lastTurn ? (
                <>
                  <p className="text-[22px] leading-snug font-medium md:text-[26px]">“{lastTurn.text}”</p>
                  <p className="mt-2.5 text-[13px] text-[#b9c0cb]">{lastTurn.role === "rep" ? "You" : lastTurn.speaker === "gatekeeper" ? gatekeeperName ?? "Gatekeeper" : firstName} · live caption</p>
                </>
              ) : (
                <p className="text-[15px] text-[#b9c0cb]">Captions appear here as you both speak.</p>
              )}
            </div>
          )}

          <p className="mt-6 min-h-5 text-sm text-[#b9c0cb]">
            {stage === "dialing" && "Ringing…"}
            {stage === "live" && (prospectSpeaking ? `${firstName} is speaking` : "Listening to you")}
            {stage === "ending" && "Call ended. Your coach is reviewing it…"}
          </p>

          {stage === "live" && silentMic && !conversation.isMuted && (
            <p className="mt-3 max-w-sm text-sm text-balance text-[#ffc9b8]" role="status">
              The prospect can't hear you. Check the mic icon in your browser's address bar for which microphone is in use, and that your headset isn't muted.
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            {stage === "live" ? (
              <>
                <button type="button" onClick={() => conversation.setMuted(!conversation.isMuted)} aria-label={conversation.isMuted ? "Unmute microphone" : "Mute microphone"} aria-pressed={conversation.isMuted} className="grid size-16 cursor-pointer place-items-center rounded-full bg-white/12 text-[#f4f1ea] outline-none transition-colors hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-[#ffb162]/60">
                  {conversation.isMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                </button>
                <button type="button" onClick={hangUp} className="inline-flex h-16 cursor-pointer items-center gap-2.5 rounded-full bg-[#a35139] px-7 text-[17px] font-semibold text-[#fbf6ee] outline-none transition-[filter] hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-[#ffb162]/60">
                  <PhoneOff className="size-5" /> End call
                </button>
              </>
            ) : (
              <span className="inline-flex h-12 items-center rounded-full border border-white/30 px-6 text-sm font-medium text-[#f4f1ea]/80">{stage === "dialing" ? "Connecting…" : "Wrapping up…"}</span>
            )}
          </div>
        </main>
      </div>,
      document.body,
    );
  }

  return (
    // translate="no": browser page translation rewrites the DOM under React, and this screen updates every second.
    <div className="mx-auto max-w-5xl" translate="no">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Before the call: who picks up, and the dial button */}
        <section className="brand-panel relative flex min-h-[560px] flex-col items-center justify-center rounded-3xl px-8 pt-20 pb-8 text-center">
          <Rays className="-right-[2%] -left-[2%]" height={300} />
          <div className="absolute top-5 left-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/10 px-3 py-1">L{level.level} {level.name}</span>
            {target.kind === "practice" && <span className="rounded-full bg-white/10 px-3 py-1">Practice persona</span>}
            {target.kind === "boss" && <span className="rounded-full bg-[#a35139] px-3 py-1">Boss fight</span>}
          </div>

          <span aria-hidden className="mb-6 grid size-28 place-items-center rounded-full border-4 border-white/20 bg-[#a35139] bg-[radial-gradient(80%_80%_at_30%_25%,#ffb162_0%,#a35139_75%)] text-3xl font-semibold text-[#1b2632]">
            {initials(target.name)}
          </span>
          <h1 className="text-[30px] font-semibold tracking-[-0.02em]">{target.name}</h1>
          <p className="mt-1.5 text-[15px] text-[#b9c0cb]">{target.title}, {target.company}</p>

          <p className="mt-6 min-h-5 text-sm text-[#b9c0cb]">
            {stage === "idle" && (!voiceConfigured ? "Voice service is not configured yet." : !audioOk ? "This browser cannot play the call." : "Ready when you are.")}
            {stage === "error" && (
              <span className="text-[#ffc9b8]">
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
            <Button size="lg" variant="signal" onClick={dial} disabled={!voiceConfigured || !audioOk}>
              <Mic /> {stage === "error" ? "Try again" : "Dial"}
            </Button>
            <Button size="lg" variant="ghost" className="text-[#f4f1ea] hover:bg-white/10 hover:text-[#f4f1ea]" asChild>
              <Link href="/practice">Back</Link>
            </Button>
          </div>
          {stage === "idle" && !audioOk && <p className="mt-6 max-w-sm text-sm text-balance text-[#ffc9b8]">{NO_WEB_AUDIO_MESSAGE} No call has been used.</p>}
          {stage === "idle" && (
            <p className="mt-8 mb-16 max-w-sm text-[13px] text-balance text-[#b9c0cb]">
              Headset on. The prospect picks up as soon as it connects. They decide how the call ends, so treat it like a real dial.
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="bg-card rounded-[18px] border p-5">
            <div className="mb-2 text-[15px] font-semibold">Your research</div>
            <p className="text-sm">
              {target.name} is {target.title} at {target.company}
              {target.industry ? ` (${target.industry})` : ""}.
            </p>
            {target.persona_notes && <p className="text-muted-foreground mt-2 text-sm">{target.persona_notes}</p>}
            <p className="text-muted-foreground mt-3 text-xs">{level.description}</p>
          </div>
          <div className="bg-card rounded-[18px] border p-5 text-sm">
            <div className="mb-1 text-[15px] font-semibold">Captions</div>
            <p className="text-muted-foreground">
              {captions ? "On. What you both say shows on screen as you talk." : "Off on this level. Just you and the voice, like a real call."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * The voice on the call: amber bars move while the prospect talks, the grey ones follow the rep's microphone, so
 * "is it hearing me" has a visible answer. Still under reduced motion.
 */
function VoiceWave({ speaking, mic }: { speaking: boolean; mic: number }) {
  const HEIGHTS = [6, 42, 44, 18, 13, 7, 17, 6, 36, 50, 26, 27, 45, 29, 7, 8, 17, 16, 23, 50, 42, 8, 40, 37, 13, 8, 16, 24, 8, 42, 52, 23, 27, 39];
  const lit = Math.min(1, Math.sqrt(Math.min(1, mic * 4)));
  return (
    <div aria-hidden className="mt-6 flex h-14 w-[min(560px,90%)] items-center gap-1">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={cn("flex-1 rounded-sm bg-[#ffb162] transition-transform duration-300", speaking && "hp-vo")}
          style={{ height: h, transform: speaking ? undefined : "scaleY(0.18)", animationDuration: `${0.7 + (i % 5) * 0.15}s`, animationDelay: `${-((i * 0.13) % 1).toFixed(2)}s` }}
        />
      ))}
      {[21, 7, 13, 27, 18, 28, 53, 40, 10, 35, 28, 9, 9, 26].map((h, i) => (
        <span key={`m${i}`} className="flex-1 rounded-sm bg-white/30 transition-transform duration-100" style={{ height: h, transform: `scaleY(${0.15 + lit * 0.85 * (0.6 + ((i * 7) % 5) / 10)})` }} />
      ))}
    </div>
  );
}
