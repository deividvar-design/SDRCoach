import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Live call screen. Wired to ElevenLabs Conversational AI in the next milestone. */
export default async function CallPage({ searchParams }: PageProps<"/practice/call">) {
  const { target, difficulty } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Live calling lands in the next milestone</h1>
      <p className="text-muted-foreground text-sm">
        Selected target <code className="font-mono text-xs">{String(target)}</code> at level <code className="font-mono text-xs">{String(difficulty)}</code>. The voice loop (ElevenLabs) and scoring (Claude) are the next things to ship.
      </p>
      <Button variant="outline" asChild>
        <Link href="/practice">Back</Link>
      </Button>
    </div>
  );
}
