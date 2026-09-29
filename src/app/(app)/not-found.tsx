import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="bg-card mx-auto max-w-lg rounded-2xl border p-8 text-center">
      <div className="font-display text-3xl">Nothing here.</div>
      <p className="text-muted-foreground mt-2 text-sm">That page or record does not exist, or it belongs to a workspace you are not in.</p>
      <Button className="mt-6" asChild><Link href="/dashboard">Back to the dashboard</Link></Button>
    </div>
  );
}
