import Image from "next/image";
/**
 * Hidden until `ready` is true. Swap the three marked fields for the real name, photo and two sentences,
 * then flip the flag. The photo slot takes a square image at /public/founder.jpg.
 */
const FOUNDER = {
  ready: false,
  name: "[Your name]",
  role: "Head of Outbound, runs an SDR floor",
  lines: "[Two sentences in your own words: what you saw reps get wrong on real dials, and why you built a place to get it wrong first.]",
  photo: null as string | null,
};

export function FounderNote() {
  if (!FOUNDER.ready) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-11 md:py-16">
      <div className="grid items-center gap-8 rounded-2xl border p-7 md:grid-cols-[auto_1fr] md:gap-10 md:p-10">
        <div className="bg-secondary text-muted-foreground grid size-28 shrink-0 place-items-center rounded-full border border-dashed text-center text-[11px] leading-tight">
          {FOUNDER.photo ? <Image src={FOUNDER.photo} alt={FOUNDER.name} width={112} height={112} className="size-28 rounded-full object-cover" /> : "Photo\nplaceholder"}
        </div>
        <div>
          <p className="font-display text-3xl leading-tight md:text-4xl">Built by a Head of Outbound who runs an SDR floor.</p>
          <p className="text-muted-foreground mt-3 max-w-2xl text-[17px]">{FOUNDER.lines}</p>
          <p className="mt-4 text-sm font-medium">{FOUNDER.name}<span className="text-muted-foreground font-normal">, {FOUNDER.role}</span></p>
        </div>
      </div>
    </section>
  );
}
