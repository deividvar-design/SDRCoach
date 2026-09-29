import { SITE } from "@/lib/site";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="text-muted-foreground text-xs">Last updated {SITE.legalUpdated}</p>
      <h1 className="font-display mt-3 text-5xl">{title}</h1>
      <p className="text-muted-foreground mt-4 text-lg">{intro}</p>
      <div className="prose mt-10">{children}</div>
    </article>
  );
}
