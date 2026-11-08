import { PLANS, TRIAL } from "@/lib/billing/plans";
import { formatMoney, type Currency } from "@/lib/billing/currency";

/** Starter against Team, row by row. Collapsed on phones, open on wider screens. */
export function CompareTable({ starterPrice, teamPrice, currency }: { starterPrice: number; teamPrice: number; currency: Currency }) {
  const starter = PLANS.find((p) => p.id === "starter")!;
  const team = PLANS.find((p) => p.id === "team")!;
  const rows: [string, string, string][] = [
    ["Price, monthly", `${formatMoney(starterPrice, currency)} per seat`, `${formatMoney(teamPrice, currency)} per seat`],
    ["Minimum seats", "1", "1"],
    ["Who it's for", "A rep practicing alone, or a small team", "A manager running an SDR team"],
    ["Practice calls", `${starter.callsPerSeat} per seat a month, shared by the team`, `${team.callsPerSeat} per seat a month, shared by the team`],
    ["Prospects", "Six ready-made prospects, three extra-hard ones, your own targets, and prospects built from your call transcripts", "The same"],
    ["Calls and docs the prospects learn from", "Up to 30 files", "Up to 100 files"],
    ["Coaching", "Scored report after every call, team heatmap, objection table, Monday email summary", "The same"],
    ["Onboarding", "Self-serve", "Personal setup: we build your first prospects from the companies you sell to"],
    ["Support", "Email", "Priority, same-day reply on working days"],
    ["Trial", `${TRIAL.calls} calls over ${TRIAL.days} days, no card`, "The same, or an extended trial on request"],
  ];
  const table = (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-3 pr-4 font-medium" scope="col"><span className="sr-only">Feature</span></th>
          <th className="py-3 pr-4 font-medium" scope="col">Starter</th>
          <th className="py-3 font-medium" scope="col">Team</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map(([k, a, b]) => (
          <tr key={k} className="align-top">
            <th scope="row" className="text-muted-foreground py-3 pr-4 text-left font-normal">{k}</th>
            <td className="py-3 pr-4">{a}</td>
            <td className="py-3">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-11 md:py-16" aria-labelledby="compare-heading">
      <h2 id="compare-heading" className="font-display text-4xl leading-[1.05] text-balance md:text-5xl">Starter and Team, side by side.</h2>
      <details className="mt-6 md:hidden">
        <summary className="cursor-pointer text-sm underline underline-offset-4">Show the comparison</summary>
        <div className="mt-4 overflow-x-auto">{table}</div>
      </details>
      <div className="mt-8 hidden md:block">{table}</div>
    </section>
  );
}
