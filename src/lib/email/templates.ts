import { SITE, absoluteUrl } from "@/lib/site";
import { TRIAL } from "@/lib/billing/plans";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f7f5f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1b19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fffdf9;border:1px solid #e6e2d8;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px 0;font-size:18px;font-weight:600">${esc(SITE.name)}</td></tr>
<tr><td style="padding:20px 32px 0;font-size:26px;line-height:1.2;font-family:Georgia,'Times New Roman',serif">${esc(title)}</td></tr>
<tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.6;color:#3b3833">${bodyHtml}</td></tr>
${cta ? `<tr><td style="padding:24px 32px 0"><a href="${cta.href}" style="display:inline-block;background:#1c1b19;color:#f7f5f0;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding:28px 32px 32px;font-size:12px;color:#8a857a">${esc(SITE.company.legalName)} · ${esc(SITE.company.address)} · <a href="${absoluteUrl("/privacy")}" style="color:#8a857a">Privacy</a></td></tr>
</table></td></tr></table></body></html>`;
}

function textOf(lines: string[], cta?: { label: string; href: string }) {
  return [...lines, cta ? `${cta.label}: ${cta.href}` : "", "", `${SITE.name} · ${SITE.company.legalName}`].filter((l) => l !== undefined).join("\n");
}

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

export const templates = {
  welcome(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Make your first call", href: absoluteUrl("/practice") };
    const lines = [
      `Hi ${p.firstName},`,
      `Your workspace for ${p.orgName} is ready. You have ${TRIAL.calls} free calls over ${TRIAL.days} days.`,
      "Start with a Level 1 persona. Nail the opener and the ask. Then try Level 3, where the prospect tries to hang up on you.",
      "Invite your reps from the Team page whenever you like.",
    ];
    return { subject: `Your ${SITE.name} workspace is ready`, html: layout("Your first prospect is waiting.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  invite(p: { inviterName: string; orgName: string; role: string; link: string }): Rendered {
    const cta = { label: "Accept invite", href: p.link };
    const lines = [`${p.inviterName} invited you to join ${p.orgName} on ${SITE.name} as a ${p.role}.`, "Practice cold calls against AI prospects and get a scored coaching report after every call.", "The link works for 7 days."];
    return { subject: `${p.inviterName} invited you to ${p.orgName} on ${SITE.name}`, html: layout(`Join ${p.orgName}.`, lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  nudge(p: { firstName: string }): Rendered {
    const cta = { label: "Dial a Level 1 persona", href: absoluteUrl("/practice") };
    const lines = [`Hi ${p.firstName},`, "Your trial has been open for three days and nobody has made a call yet. The first one takes two minutes and the report lands a minute after.", "Level 1 is friendly. Nobody scores well on their first dial, which is the point."];
    return { subject: "Two minutes for your first practice call", html: layout("The first call is the hardest. It's also two minutes.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  twoCallsLeft(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "See plans", href: absoluteUrl("/upgrade") };
    const lines = [`Hi ${p.firstName},`, `${p.orgName} has two trial calls left. After that, dialing pauses until you pick a plan. Your history, targets and scores stay.`, "Plans are per seat with a monthly call allowance, and you can change seats any time."];
    return { subject: "Two trial calls left", html: layout("Two calls left on the trial.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  trialEnded(p: { firstName: string; orgName: string; reason: "calls" | "time" }): Rendered {
    const cta = { label: "Choose a plan", href: absoluteUrl("/upgrade") };
    const lines = [`Hi ${p.firstName},`, p.reason === "calls" ? `${p.orgName} has used all ${TRIAL.calls} trial calls.` : `${p.orgName}'s ${TRIAL.days}-day trial has ended.`, "Everything you built is still there. Pick a plan and the team is dialing again in a minute."];
    return { subject: `Your ${SITE.name} trial has ended`, html: layout("The trial is over. The reps don't have to stop.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  subscriptionStarted(p: { firstName: string; orgName: string; plan: string; seats: number }): Rendered {
    const cta = { label: "Invite your reps", href: absoluteUrl("/team") };
    const lines = [`Hi ${p.firstName},`, `${p.orgName} is on the ${p.plan} plan with ${p.seats} seat${p.seats === 1 ? "" : "s"}. Thank you.`, "Invoices, seats and payment details are under Settings → Manage billing."];
    return { subject: `Welcome to ${SITE.name} ${p.plan}`, html: layout("You're all set.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  paymentFailed(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Update payment details", href: absoluteUrl("/settings") };
    const lines = [`Hi ${p.firstName},`, `The latest payment for ${p.orgName} didn't go through. Calling keeps working while we retry over the next few days.`, "Updating the card takes a minute."];
    return { subject: `Payment failed for ${p.orgName}`, html: layout("A payment didn't go through.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  subscriptionCanceled(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Export your data", href: absoluteUrl("/settings") };
    const lines = [`Hi ${p.firstName},`, `${p.orgName}'s subscription has ended. Your workspace stays readable for 30 days and you can export everything from Settings.`, "If this was a mistake, pick a plan again and nothing is lost."];
    return { subject: `${p.orgName}'s subscription has ended`, html: layout("Subscription ended.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  weeklyDigest(p: { firstName: string; orgName: string; d: { calls: number; reviewed: number; booked: number; avg: number | null; topRep: { name: string; avg: number; calls: number } | null; weakest: { label: string; avg: number } | null; objection: { label: string; count: number; clean: number; coaching: string } | null; unreviewed: number } }): Rendered {
    const cta = { label: "Open the coaching view", href: absoluteUrl("/team/coaching") };
    const d = p.d;
    const lines = [
      `Hi ${p.firstName}, here is last week on the floor at ${p.orgName}.`,
      `${d.calls} ${d.calls === 1 ? "call" : "calls"}, ${d.reviewed} reviewed, ${d.booked} ${d.booked === 1 ? "meeting" : "meetings"} booked${d.avg != null ? `, team average ${d.avg.toFixed(1)}/10` : ""}.`,
      d.topRep ? `Top of the board: ${d.topRep.name} at ${d.topRep.avg.toFixed(1)} over ${d.topRep.calls} ${d.topRep.calls === 1 ? "call" : "calls"}.` : "",
      d.weakest ? `Weakest skill: ${d.weakest.label.toLowerCase()} at ${d.weakest.avg.toFixed(1)}. Worth ten minutes in the next team meeting.` : "",
      d.objection ? `Most mishandled objection: "${d.objection.label}", heard ${d.objection.count} times, handled cleanly ${d.objection.clean}. ${d.objection.coaching}` : "",
      d.unreviewed > 0 ? `${d.unreviewed} ${d.unreviewed === 1 ? "call was" : "calls were"} made without a review. You can request one from the report.` : "",
    ].filter(Boolean);
    return { subject: `Last week on the floor: ${d.calls} ${d.calls === 1 ? "call" : "calls"}, ${d.booked} booked`, html: layout("Last week on the floor.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },
};
