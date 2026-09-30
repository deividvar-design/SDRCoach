"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  /** Null until the Stripe webhook has flipped the org to a paid plan. */
  plan: { name: string; seats: number; callsPerSeat: number | null; billed: string | null } | null;
}

/** Shown once after Stripe sends the buyer back. The query string is dropped on close so a refresh stays quiet. */
export function SubscribedDialog({ plan }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const pending = plan === null;

  // The webhook usually lands within a second or two; refresh a few times until the plan shows up.
  useEffect(() => {
    if (!pending) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 10) window.clearInterval(id);
    }, 2000);
    return () => window.clearInterval(id);
  }, [pending, router]);

  function close() {
    setOpen(false);
    window.history.replaceState(null, "", "/settings");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      {open && !pending && <Confetti />}
      <DialogContent className="sm:max-w-xl text-center">
        <DialogHeader className="items-center text-center">
          <p className="text-signal text-xs font-medium tracking-[0.18em] uppercase">{pending ? "Almost there" : "Welcome aboard"}</p>
          <DialogTitle className="font-display text-4xl leading-tight font-normal sm:text-5xl">
            {pending ? "Setting up your plan." : `You're on ${plan.name}.`}
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-md text-base">
            {pending
              ? "Payment went through. Your workspace will switch over in a moment."
              : [
                  `${plan.seats} ${plan.seats === 1 ? "seat" : "seats"}`,
                  plan.billed ? plan.billed.toLowerCase() : null,
                  plan.callsPerSeat ? `${plan.callsPerSeat} practice calls per seat every month` : null,
                ]
                  .filter(Boolean)
                  .join(", ") + ". Thanks for backing the team."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" onClick={close}>
            <Link href="/team">Invite your team</Link>
          </Button>
          <Button asChild size="lg" variant="outline" onClick={close}>
            <Link href="/practice">Make a call</Link>
          </Button>
        </div>
        <button type="button" onClick={close} className="text-muted-foreground mx-auto mt-1 text-sm underline-offset-4 hover:underline cursor-pointer">
          Back to settings
        </button>
      </DialogContent>
    </Dialog>
  );
}

const COLOURS = ["oklch(0.5 0.2 262)", "oklch(0.72 0.16 262)", "oklch(0.8 0.17 85)", "oklch(0.65 0.18 145)", "oklch(0.95 0.01 85)"];

/** A few seconds of paper falling over the dialog. Skipped when the viewer prefers reduced motion. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => window.innerWidth;
    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * w(),
      y: -20 - Math.random() * window.innerHeight * 0.6,
      size: 6 + Math.random() * 6,
      vx: -1 + Math.random() * 2,
      vy: 2.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));

    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - started;
      ctx.clearRect(0, 0, w(), window.innerHeight);
      const fade = elapsed > 3200 ? Math.max(0, 1 - (elapsed - 3200) / 800) : 1;
      ctx.globalAlpha = fade;
      for (const p of pieces) {
        p.x += p.vx + Math.sin((now + p.size * 100) / 400) * 0.6;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.colour;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < 4000) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w(), window.innerHeight);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60]" />;
}
