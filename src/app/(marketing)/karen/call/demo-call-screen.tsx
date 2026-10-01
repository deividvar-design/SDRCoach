"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { cn, formatDuration, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { track } from "@/components/analytics/provider";
import { stripVoiceTags } from "@/lib/elevenlabs/tags";

interface Props {
  prospect: { name: string; title: string; company: string; notes: string };
  maxSeconds: number;
  voiceConfigured: boolean;
}

type Stage = "idle" | "dialing" | "live" | "ending" | "error";
interface LiveTurn {
  role: "rep" | "prospect";
  text: string;
}

export function DemoCallScreen(props: Props) {
  return (
    <ConversationProvider>
      <Inner {...props} />
    </ConversationProvider>
  );
}

function Inner({ prospect, maxSeconds, voiceConfigured }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const endedRef = useRef(false);
  const linkedRef = useRef<Promise<unknown> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const endOnServer = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    await linkedRef.current?.catch(() => {});
    await fetch("/api/demo/end", { method: "POST" }).catch(() => {});
  }, []);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      setStage("live");
      linkedRef.current = fetch("/api/demo/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId }) }).catch(() => {});
    },
    onMessage: ({ message, role }) => {
      const text = stripVoiceTags(message);
      if (text) setTurns((prev) => [...prev, { role: role === "agent" ? "prospect" : "rep", text }]);
    },
    onDisconnect: () => {
      track("demo_call_ended");
      setStage((s) => (s === "live" || s === "dialing" ? "ending" : s));
      endOnServer().then(() => router.push("/karen/result"));
    },
    onError: (message) => {
      setError(message);
      setStage("error");
      endOnServer();
    },
  });

  // Timer with the hard cap: Karen's time is precious and so is the voice budget.
  useEffect(() => {
    if (stage !== "live") return;
    const start = Date.now();
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(secs);
      if (secs >= maxSeconds) {
        clearInterval(id);
        setStage("ending");
        conversation.endSession();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, maxSeconds]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    const onHide = () => {
      if ((stage === "live" || stage === "dialing") && !endedRef.current) navigator.sendBeacon?.("/api/demo/end");
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [stage]);

  async function dial() {
    setTurns([]);
    setElapsed(0);
    setError(null);
    setStage("dialing");
    try {
      const granted = await navigator.permissions?.query({ name: "microphone" as PermissionName }).then((p) => p.state === "granted").catch(() => false);
      if (!granted) (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop());
      const res = await fetch("/api/demo/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the call");
      track("demo_call_started");
      await new Promise((r) => setTimeout(r, 1200));
      conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
        overrides: {
          agent: { prompt: { prompt: data.overrides.prompt }, firstMessage: data.overrides.firstMessage, language: "en" },
          ...(data.overrides.voiceId ? { tts: { voiceId: data.overrides.voiceId } } : {}),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start the call";
      setError(message.includes("Permission") || message.includes("NotAllowed") ? "Microphone access is required to call Karen." : message);
      setStage("error");
    }
  }

  function hangUp() {
    setStage("ending");
    conversation.endSession();
  }

  const speaking = stage === "live" && conversation.isSpeaking;
  const remaining = Math.max(0, maxSeconds - elapsed);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="bg-card paper-grain relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden rounded-2xl border p-8 text-center">
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <Badge variant="destructive">Boss fight</Badge>
            <Badge variant="outline">Demo</Badge>
          </div>
          <div className="relative mb-6 grid place-items-center">
            {(stage === "dialing" || speaking) && <span className={cn("bg-signal/30 absolute size-32 rounded-full", stage === "dialing" ? "dial-ring" : "ring-speaking")} />}
            <div className={cn("bg-primary text-primary-foreground relative grid size-32 place-items-center rounded-full text-3xl font-medium transition-transform", speaking && "scale-105")}>{initials(prospect.name)}</div>
          </div>
          <h1 className="font-display text-4xl">{prospect.name}</h1>
          <p className="text-muted-foreground mt-1">{prospect.title}, {prospect.company}</p>
          {(stage === "live" || stage === "ending") && (
            <div className="bg-background/80 mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm tabular">
              {stage === "live" ? (
                <>
                  <span className="bg-signal size-2 rounded-full live-pulse" />
                  <span className="text-signal font-medium">LIVE</span>
                </>
              ) : (
                <span className="text-muted-foreground">Ended</span>
              )}
              <span>{formatDuration(elapsed)}</span>
              {stage === "live" && <span className={cn("text-muted-foreground", remaining <= 30 && "text-destructive")}>· {formatDuration(remaining)} left</span>}
            </div>
          )}
          <p className="text-muted-foreground mt-6 h-5 text-sm">
            {stage === "idle" && (voiceConfigured ? "Headset on. She picks up as soon as it connects." : "Voice service is not configured yet.")}
            {stage === "dialing" && "Ringing…"}
            {stage === "live" && (speaking ? "Karen is speaking" : "Listening to you")}
            {stage === "ending" && "Call ended. The coach is reviewing it…"}
            {stage === "error" && <span className="text-destructive">{error}</span>}
          </p>
          <div className="mt-8 flex items-center gap-3">
            {stage === "idle" ? (
              <Button size="lg" variant="signal" onClick={dial} disabled={!voiceConfigured}><Mic /> Dial Karen</Button>
            ) : stage === "error" ? (
              <Button size="lg" variant="outline" asChild><Link href="/karen">Back</Link></Button>
            ) : stage === "live" ? (
              <>
                <Button size="icon-lg" variant="outline" onClick={() => conversation.setMuted(!conversation.isMuted)} aria-label={conversation.isMuted ? "Unmute" : "Mute"}>{conversation.isMuted ? <MicOff /> : <Mic />}</Button>
                <Button size="icon-lg" variant="destructive" onClick={hangUp} aria-label="Hang up"><PhoneOff /></Button>
              </>
            ) : (
              <Button size="lg" variant="outline" disabled>{stage === "dialing" ? "Connecting…" : "Wrapping up…"}</Button>
            )}
          </div>
          {stage === "idle" && <p className="text-muted-foreground mt-8 max-w-sm text-xs text-balance">One call, three minutes. She decides how it ends. Your scorecard is on screen a minute after and in your inbox right behind it.</p>}
        </section>
        <aside className="flex flex-col gap-4">
          <div className="bg-card rounded-2xl border p-5">
            <div className="text-muted-foreground mb-2 text-xs">Your research</div>
            <p className="text-sm">{prospect.name} is {prospect.title} at {prospect.company}.</p>
            <p className="text-muted-foreground mt-2 text-sm">{prospect.notes}</p>
          </div>
          <div className="bg-card flex min-h-[240px] flex-1 flex-col rounded-2xl border">
            <div className="text-muted-foreground border-b px-5 py-3 text-xs">Live transcript</div>
            <div ref={transcriptRef} className="max-h-[400px] flex-1 space-y-3 overflow-y-auto p-5">
              {turns.length === 0 ? (
                <p className="text-muted-foreground text-sm">Words appear here as you both speak.</p>
              ) : (
                turns.map((t, i) => (
                  <div key={i} className={cn("text-sm", t.role === "rep" ? "text-foreground" : "text-muted-foreground")}>
                    <span className="mr-2 text-[11px]">{t.role === "rep" ? "You" : "Karen"}</span>
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
