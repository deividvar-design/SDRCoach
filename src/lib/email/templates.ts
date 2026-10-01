import { SITE, absoluteUrl } from "@/lib/site";
import { TRIAL } from "@/lib/billing/plans";
import { RUBRIC, type RubricKey } from "@/lib/scoring/rubric";
import { OUTCOME_TEXT } from "@/lib/domain/session-status";
import type { ScoreDimensions } from "@/types/database";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f7f5f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1b19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fffdf9;border:1px solid #e6e2d8;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px 0;font-size:18px;font-weight:600">${esc(SITE.name)}</td></tr>
<tr><td style="padding:20px 32px 0;font-size:26px;line-height:1.2;font-family:Georgia,'Times New Roman',serif">${esc(title)}</td></tr>
<tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.6;color:#3b3833">${bodyHtml}</td></tr>
${cta ? `<tr><td style="padding:24px 32px 0"><a href="${cta.href}" style="display:inline-block;background:#1c1b19;color:#f7f5f0;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding:28px 32px 32px;font-size:12px;color:#8a857a">${esc(SITE.company.legalName)}${SITE.company.address ? ` · ${esc(SITE.company.address)}` : ""} · <a href="${absoluteUrl("/privacy")}" style="color:#8a857a">Privacy</a></td></tr>
</table></td></tr></table></body></html>`;
}

function textOf(lines: string[], cta?: { label: string; href: string }) {
  return [...lines, cta ? `${cta.label}: ${cta.href}` : "", "", `${SITE.name} · ${SITE.company.legalName}`].filter((l) => l !== undefined).join("\n");
}

export interface Rendered {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export const templates = {
  feedback(p: { name: string; email: string; orgName: string; role: string; page: string; body: string; replyOk: boolean }): Rendered {
    const meta = [`${p.name} <${p.email}>`, `${p.orgName}, ${p.role}`, `On ${p.page}`, p.replyOk ? "Happy to be emailed back." : "Asked not to be emailed."];
    const html = `<p style="margin:0 0 16px;white-space:pre-wrap">${esc(p.body)}</p><p style="margin:0;font-size:13px;color:#8a857a">${meta.map(esc).join("<br>")}</p>`;
    return { subject: `Feedback from ${p.name} at ${p.orgName}`, html: layout("Someone wrote in.", html), text: textOf([p.body, "", ...meta]) };
  },

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

  nudgeDay1(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Make the first call", href: absoluteUrl("/practice") };
    const lines = [
      `Hi ${p.firstName},`,
      `${p.orgName}'s workspace has been open for a day and no call has been made yet. Nothing is wrong, it just means the interesting part hasn't started.`,
      "Pick any prospect, put on a headset and dial. Two minutes on the call, one minute for the report. Nobody scores well on the first one, and that's the point of a practice line.",
    ];
    return { subject: "Your first prospect is still waiting", html: layout("The first dial is the whole trial.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  nudge(p: { firstName: string }): Rendered {
    const cta = { label: "Dial a Level 1 persona", href: absoluteUrl("/practice") };
    const lines = [`Hi ${p.firstName},`, "Your trial has been open for three days and nobody has made a call yet. The first one takes two minutes and the report lands a minute after.", "Level 1 is friendly. Nobody scores well on their first dial, which is the point."];
    return { subject: "Two minutes for your first practice call", html: layout("The first call is the hardest. It's also two minutes.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  threeDaysLeft(p: { firstName: string; orgName: string; calls: number; daysLeft: number }): Rendered {
    const cta = { label: "Pick a plan", href: absoluteUrl("/upgrade") };
    const made = p.calls === 0 ? "no practice calls yet" : `${p.calls} practice call${p.calls === 1 ? "" : "s"}`;
    const lines = [
      `Hi ${p.firstName},`,
      `${p.orgName}'s trial ends in ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}. The team has made ${made}. Everything stays: targets, recordings, scores and the coaching view.`,
      "Upgrade before the trial ends and your first three months are 15% off, applied automatically at checkout. Plans are per seat, monthly, quarterly or yearly, and every first payment carries a 30-day money-back guarantee.",
      `Want a few more days instead? Reply to this email and say so.`,
    ];
    return { subject: `${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"} left on ${p.orgName}'s trial`, html: layout("Three days left. Here's where you stand.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  chaseOne(p: { firstName: string; orgName: string; calls: number }): Rendered {
    const cta = { label: "Pick a plan", href: absoluteUrl("/upgrade") };
    const lines = [
      `Hi ${p.firstName},`,
      p.calls > 0
        ? `${p.orgName}'s trial ended two days ago with ${p.calls} practice call${p.calls === 1 ? "" : "s"} on the board. The targets, recordings, scores and coaching view are all still there, frozen where you left them.`
        : `${p.orgName}'s trial ended two days ago and nobody made a call. That usually means the week got away from you, not that the idea was wrong.`,
      "A plan starts at one seat and takes a minute to set up. Dialing resumes the moment it goes through, and the first payment carries a 30-day money-back guarantee.",
      "If something stopped you, reply and say what it was. We read every one.",
    ];
    return { subject: `${p.orgName} on ${SITE.name}: what happens next`, html: layout("The trial ended. The work didn't have to.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta), replyTo: SITE.company.email };
  },

  chaseFeedback(p: { firstName: string; orgName: string }): Rendered {
    const lines = [
      `Hi ${p.firstName},`,
      `You tried ${SITE.name} with ${p.orgName} and didn't pick a plan. Fair enough. I'd like to know why, in one line, because it decides what we build next.`,
      "Was it the prospects, the scoring, the price, the timing, or something I haven't thought of? Reply to this email with whichever it was. One word is fine.",
      "If it was something we can fix, I'll tell you when it's fixed.",
    ];
    return { subject: "One line: what stopped you?", html: layout("What stopped you?", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")), text: textOf(lines), replyTo: SITE.company.email };
  },

  chaseBreakup(p: { firstName: string; orgName: string; until: string }): Rendered {
    const cta = { label: "Pick a plan with 20% off", href: absoluteUrl("/upgrade") };
    const lines = [
      `Hi ${p.firstName},`,
      `This is the last email about ${p.orgName}'s trial. If the timing was wrong, no hard feelings, and your workspace stays readable so nothing is lost.`,
      `If it was close, here is a nudge: pick any plan before ${p.until} and your first three months are 20% off. It is applied automatically at checkout, no code to type.`,
      "After that we stop writing, and you can come back whenever the team is ready.",
    ];
    return { subject: `Last one from us: 20% off until ${p.until}`, html: layout("Last one from us.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta), replyTo: SITE.company.email };
  },

  demoFollowUp(p: { firstName: string; email: string; overall: number; outcome: string }): Rendered {
    const cta = { label: "Start a free trial", href: absoluteUrl(`/signup?email=${encodeURIComponent(p.email)}`) };
    const won = p.outcome === "meeting_booked" || p.outcome === "callback";
    const lines = [
      `Hi ${p.firstName},`,
      won
        ? `You got ${p.overall.toFixed(1)} against Karen and she gave you a next step. Almost nobody does. The question is whether your reps can.`
        : `You scored ${p.overall.toFixed(1)} against Karen. She is built so that most people land between four and six, so that is about where it should be on a first go.`,
      "The people who score highest against her do two things: they keep every turn under fifteen words, and they ask one specific question about her world before they say anything about their own. Both are habits, and habits come from reps.",
      `A free trial gives your team ${TRIAL.calls} calls over ${TRIAL.days} days against prospects built from your own targets, at three levels, with Karen and two other boss fights thrown in. Work email, no card.`,
    ];
    return { subject: won ? "You beat Karen. Can your team?" : `${p.overall.toFixed(1)} against Karen. Here's how to climb`, html: layout("Round two.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
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

  demoScorecard(p: { firstName: string; email: string; overall: number; outcome: string; outcomeReason: string; dimensions: ScoreDimensions; strengths: string[]; improvements: string[]; coachSummary: string }): Rendered {
    const cta = { label: "Start a free trial with this address", href: absoluteUrl(`/signup?email=${encodeURIComponent(p.email)}`) };
    const rows = (Object.keys(RUBRIC) as RubricKey[]).map((k) => ({ label: RUBRIC[k].label, score: p.dimensions[k].score, note: p.dimensions[k].rationale }));
    const outcome = OUTCOME_TEXT[p.outcome] ?? p.outcome;
    const html = [
      `<p style="margin:0 0 12px">Hi ${esc(p.firstName)},</p>`,
      `<p style="margin:0 0 12px">You called Karen. She ${esc(outcome.toLowerCase())}. ${esc(p.outcomeReason)}</p>`,
      `<p style="margin:0 0 16px;font-size:32px;font-family:Georgia,'Times New Roman',serif">${p.overall.toFixed(1)}<span style="font-size:14px;color:#8a857a"> / 10 overall</span></p>`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">${rows.map((r) => `<tr><td style="padding:8px 0;border-top:1px solid #e6e2d8;font-size:14px;width:40%">${esc(r.label)}</td><td style="padding:8px 0;border-top:1px solid #e6e2d8;font-size:14px;font-weight:600;width:10%">${r.score}</td><td style="padding:8px 0;border-top:1px solid #e6e2d8;font-size:13px;color:#8a857a">${esc(r.note)}</td></tr>`).join("")}</table>`,
      `<p style="margin:0 0 6px;font-weight:600">What worked</p>${p.strengths.map((x) => `<p style="margin:0 0 6px">${esc(x)}</p>`).join("")}`,
      `<p style="margin:12px 0 6px;font-weight:600">What to fix first</p>${p.improvements.map((x) => `<p style="margin:0 0 6px">${esc(x)}</p>`).join("")}`,
      `<p style="margin:16px 0 0;color:#3b3833">${esc(p.coachSummary)}</p>`,
      `<p style="margin:16px 0 0;font-size:13px;color:#8a857a">Karen is one of the prospects in ${esc(SITE.name)}. Reps dial prospects built from their own targets, at three levels, and every call is scored like this one. Ten calls are free.</p>`,
    ].join("");
    const text = [
      `Hi ${p.firstName},`,
      `You called Karen. She ${outcome.toLowerCase()}. ${p.outcomeReason}`,
      `Overall: ${p.overall.toFixed(1)} / 10`,
      ...rows.map((r) => `${r.label}: ${r.score}. ${r.note}`),
      "",
      "What worked:",
      ...p.strengths,
      "",
      "What to fix first:",
      ...p.improvements,
      "",
      p.coachSummary,
    ];
    return { subject: `Your call with Karen: ${p.overall.toFixed(1)} / 10`, html: layout("Here's how it went.", html, cta), text: textOf(text, cta) };
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
