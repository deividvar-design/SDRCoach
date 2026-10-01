import { redirect } from "next/navigation";
import { currentDemo } from "@/lib/demo/session";
import { DEMO_MAX_SECONDS, KAREN } from "@/lib/demo/boss";
import { DemoCallScreen } from "./demo-call-screen";

export const metadata = { title: "Calling Karen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function KarenCallPage() {
  const demo = await currentDemo();
  if (!demo) redirect("/karen");
  if (demo.status !== "created") redirect("/karen/result");
  return (
    <DemoCallScreen
      prospect={{ name: KAREN.name, title: KAREN.title, company: KAREN.company, notes: KAREN.persona_notes }}
      maxSeconds={DEMO_MAX_SECONDS}
      voiceConfigured={Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID)}
    />
  );
}
