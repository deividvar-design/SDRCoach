import Image from "next/image";
import { cn } from "@/lib/utils";
import { Section } from "@/components/marketing/sections";
import type { Testimonial } from "@/content/testimonials";

/** The company mark, greyed so it reads as attribution rather than advertising. */
function Logo({ t, className }: { t: Testimonial; className?: string }) {
  return (
    // Plain img: the file is a small SVG and next/image would only add a wrapper.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.logo} alt={t.company} className={cn("h-5 w-auto opacity-60 grayscale", className)} />
  );
}

function Avatar({ t }: { t: Testimonial }) {
  if (t.avatar) return <Image src={t.avatar} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />;
  return <span className="bg-muted text-foreground grid size-12 place-items-center rounded-full text-sm font-medium" aria-hidden>{t.initials}</span>;
}

/** The full quote: lead line, body, and the person beside it. Sits between the scored-call sample and how it works. */
export function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <Section className="border-t">
      <figure className="bg-card grid gap-8 rounded-2xl border p-6 md:p-10 lg:grid-cols-[1fr_12rem] lg:gap-10">
        <blockquote>
          <p className="font-display text-3xl leading-[1.15] text-balance md:text-4xl">“{t.quote}”</p>
          <p className="text-muted-foreground text-body mt-6 max-w-2xl">{t.body}</p>
        </blockquote>
        <figcaption className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5 lg:border-l lg:pl-8">
          <Avatar t={t} />
          <div>
            <div className="font-medium">{t.name}</div>
            <div className="text-muted-foreground text-sm">{t.title}</div>
            <Logo t={t} className="mt-3" />
          </div>
        </figcaption>
      </figure>
    </Section>
  );
}

/** One slim line under the hero: logo, the lead quote, the name. Hidden on phones so the hero's buttons stay where they are. */
export function TestimonialStrip({ t, className }: { t: Testimonial; className?: string }) {
  return (
    <figure className={cn("hidden items-center gap-3 md:flex", className)}>
      <Logo t={t} className="h-4 shrink-0" />
      <blockquote className="text-muted-foreground min-w-0 text-sm">
        <span>“{t.pull}”</span>
      </blockquote>
      <figcaption className="text-muted-foreground shrink-0 text-xs">{t.name}, {t.shortTitle}</figcaption>
    </figure>
  );
}
