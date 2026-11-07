import { Section } from "@/components/marketing/sections";

export const metadata = { title: "Done", robots: { index: false, follow: false } };

export default function OptedOutPage() {
  return (
    <Section className="pt-14 md:pt-20">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-5xl">Done.</h1>
        <p className="text-muted-foreground mt-4 text-lg">You won't get introductions like that from 100 Dials again. Nothing else changes, and nothing was added to any list.</p>
      </div>
    </Section>
  );
}
