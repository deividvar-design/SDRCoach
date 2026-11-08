import { SITE, absoluteUrl } from "@/lib/site";
import { bookingUrl } from "@/content/booking";
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
<tr><td style="padding:28px 32px 32px;font-size:12px;color:#8a857a">${esc(SITE.company.legalName)} · <a href="${absoluteUrl("/privacy")}" style="color:#8a857a">Privacy</a>${SITE.company.address ? `<div style="margin-top:6px;font-size:10px;line-height:1.4;color:#b5b0a6">${esc(SITE.company.address)}</div>` : ""}</td></tr>
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
  continueOnWork(p: { href: string }): Rendered {
    const cta = { label: "Start the free trial", href: p.href };
    const lines = ["You asked us to send the signup link to this address.", "The trial creates a workspace for your company domain, so it has to start from a work email. This one works. Ten calls, fourteen days, no card.", "If you did not ask for this, ignore it and nothing happens."];
    return { subject: "Your 100 Dials signup link", html: layout("Continue from here.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** A reward landed: what was added and why. */
  rewardGranted(p: { firstName: string; title: string; line: string; detail: string | null; href: string }): Rendered {
    const cta = { label: "See your rewards", href: p.href };
    const lines = [`Hi ${p.firstName},`, p.line === "nothing" ? `${p.title}.` : `${p.title}: ${p.line} added to your workspace.`, ...(p.detail ? [p.detail] : []), "Thanks for spreading the word. The more reps practise, the better the coach gets at this."];
    return { subject: p.line === "nothing" ? p.title : `${p.line} added to your workspace`, html: layout("Reward added.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** A pasted link was turned down, with the reason. */
  rewardRejected(p: { firstName: string; title: string; note: string | null; href: string }): Rendered {
    const cta = { label: "Try again", href: p.href };
    const lines = [`Hi ${p.firstName},`, `We looked at your claim for "${p.title}" and could not add the calls.`, p.note ? `Reason: ${p.note}` : "The link did not lead to a public post about 100 Dials.", "Fix it and claim again any time; the card is still open."];
    return { subject: `About your reward claim`, html: layout("Not this one.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  feedback(p: { name: string; email: string; orgName: string; role: string; page: string; body: string; replyOk: boolean }): Rendered {
    const meta = [`${p.name} <${p.email}>`, `${p.orgName}, ${p.role}`, `On ${p.page}`, p.replyOk ? "Happy to be emailed back." : "Asked not to be emailed."];
    const html = `<p style="margin:0 0 16px;white-space:pre-wrap">${esc(p.body)}</p><p style="margin:0;font-size:13px;color:#8a857a">${meta.map(esc).join("<br>")}</p>`;
    return { subject: `Feedback from ${p.name} at ${p.orgName}`, html: layout("Someone wrote in.", html), text: textOf([p.body, "", ...meta]) };
  },

  /** Day 1 of the quick start, sent the moment the workspace exists: one button, Karen. */
  welcome(p: { firstName: string; orgName: string; karenHref: string }): Rendered {
    const cta = { label: "Dial Karen", href: p.karenHref };
    const lines = [
      `Hi ${p.firstName},`,
      `Your workspace for ${p.orgName} is ready, and Karen is waiting. Head of Procurement, twenty-two years in, does not take cold calls.`,
      "Two minutes on the phone with her tells you more about a rep than a week of shadowing. Nobody books her. Staying composed is the win, and the coach scores exactly that.",
      `You have ${TRIAL.calls} free calls over ${TRIAL.days} days. Spend the first one on her.`,
    ];
    return { subject: "Karen is waiting", html: layout("Dial Karen.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** Day 2: a prospect from their own list. Suppressed once a real target exists. */
  quickDay2(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Build a prospect", href: absoluteUrl("/targets") };
    const lines = [
      `Hi ${p.firstName},`,
      "Pick one account from this quarter's list. Name, title, what they would push back on. Two minutes.",
      `From then on ${p.orgName}'s reps dial your market, in its own words, instead of ours.`,
    ];
    return { subject: "Build a prospect from your real list", html: layout("Your market, not ours.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** Day 3: the coach review. Suppressed once any call has been scored. */
  quickDay3(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Request the review", href: absoluteUrl("/sessions") };
    const lines = [
      `Hi ${p.firstName},`,
      "Open any call and ask for the coach's review. Six skills scored from the transcript, every objection tagged as handled or missed, and the one thing to change on the next dial.",
      "It takes about a minute and it is the part reps come back for.",
    ];
    return { subject: "Request the coach review", html: layout("Get the call scored.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** Day 4: the team view. Suppressed once a second member has joined. */
  quickDay4(p: { firstName: string; orgName: string }): Rendered {
    const cta = { label: "Open the team view", href: absoluteUrl("/team") };
    const lines = [
      `Hi ${p.firstName},`,
      "Invite one rep. The team page shows the weakest skill on the floor and the objection the team keeps losing, so the next one-to-one has an agenda before you open the call list.",
      "Invites take a name and an email. The rep is dialing inside five minutes.",
    ];
    return { subject: "Open the team view", html: layout("Coach the pattern, not the call.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** Internal: a trial that has not dialed by the end of day three. Everything needed to pick up the phone. */
  stalledTrial(p: { name: string; email: string; orgName: string; domain: string | null; reason: string | null; goal: string | null; variant: string | null; signedUp: string; adminUrl: string }): Rendered {
    const rows: [string, string][] = [
      ["Name", p.name],
      ["Email", p.email],
      ["Company", p.orgName],
      ["Domain", p.domain ?? "—"],
      ["Why here", p.reason ?? "—"],
      ["Worth paying for", p.goal ?? "—"],
      ["Headline variant", p.variant ?? "—"],
      ["Signed up", p.signedUp],
    ];
    const html = `<p style="margin:0 0 12px">Three days in, no call. Worth a phone call from you.</p><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;font-size:13px;color:#8a857a;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-size:14px">${esc(v)}</td></tr>`).join("")}</table>`;
    const cta = { label: "Open signups", href: p.adminUrl };
    return { subject: `Stalled trial: ${p.orgName} (${p.name})`, html: layout("A trial stalled.", html, cta), text: textOf(["Three days in, no call.", ...rows.map(([k, v]) => `${k}: ${v}`)], cta) };
  },

  accessLink(p: { company: string; calls: number; days: number; link: string }): Rendered {
    const cta = { label: "Choose a password and start", href: p.link };
    const lines = [`We set up a ${SITE.name} workspace for ${p.company}: ${p.calls} calls over ${p.days} days, no card and no signup form.`, "Open the link, choose a password, and your first AI prospect picks up a minute later. Every call comes back scored on six skills with the one thing to fix.", "The link works once and is yours alone."];
    return { subject: `Your ${SITE.name} workspace for ${p.company} is ready`, html: layout("You're in.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  invite(p: { inviterName: string; orgName: string; role: string; link: string }): Rendered {
    const cta = { label: "Accept invite", href: p.link };
    const lines = [`${p.inviterName} invited you to join ${p.orgName} on ${SITE.name} as a ${p.role}.`, "Dial AI prospects built from your team's targets and get a scored coaching report after every call.", "The link works for 7 days."];
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

  demoFollowUp(p: { firstName: string; email: string; overall: number; outcome: string; unsubscribeUrl: string }): Rendered {
    const cta = { label: "Start a free trial", href: absoluteUrl(`/signup?email=${encodeURIComponent(p.email)}`) };
    const won = p.outcome === "meeting_booked" || p.outcome === "callback";
    const lines = [
      `Hi ${p.firstName},`,
      won
        ? `You got ${p.overall.toFixed(1)} against Karen and she gave you a next step. Almost nobody does. The question is whether your reps can.`
        : `You scored ${p.overall.toFixed(1)} against Karen. She is built so that most people land between four and six, so that is about where it should be on a first go.`,
      "The people who score highest against her do two things: they keep every turn under fifteen words, and they ask one specific question about her world before they say anything about their own. Both are habits, and habits come from reps.",
      `A free trial gives your team ${TRIAL.calls} calls over ${TRIAL.days} days against prospects built from your own targets, at three levels, with Karen and two other boss fights thrown in. Any email, no card.`,
    ];
    const foot = `<p style="margin:12px 0 0;font-size:12px;color:#8a857a">This is the last email about your call. <a href="${p.unsubscribeUrl}" style="color:#8a857a">No more from us</a>.</p>`;
    return { subject: won ? "You beat Karen. Can your team?" : `${p.overall.toFixed(1)} against Karen. Here's how to climb`, html: layout("Round two.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("") + foot, cta), text: textOf([...lines, "", `No more emails: ${p.unsubscribeUrl}`], cta) };
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

  demoScorecard(p: { firstName: string; email: string; overall: number; outcome: string; outcomeReason: string; dimensions: ScoreDimensions; strengths: string[]; improvements: string[]; coachSummary: string; unsubscribeUrl: string; shareUrl?: string | null; personalEmail?: boolean; cameFrom?: { text: string; url: string } | null }): Rendered {
    const cta = { label: "Start the team trial", href: p.personalEmail ? absoluteUrl("/signup") : absoluteUrl(`/signup?email=${encodeURIComponent(p.email)}`) };
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
      `<p style="margin:20px 0 0;font-weight:600">Your team's reps face these same objections.</p><p style="margin:4px 0 0">Build their prospects from your own calls — 5 free calls, no card.</p>`,
      p.cameFrom ? `<p style="margin:12px 0 0;font-size:14px">You came from: ‘${esc(p.cameFrom.text)}’. <a href="${p.cameFrom.url}" style="color:#1c1b19">Read how to handle it →</a></p>` : "",
      p.shareUrl ? `<p style="margin:16px 0 0;font-size:14px">Your scorecard has a public page: <a href="${p.shareUrl}" style="color:#1c1b19">${esc(p.shareUrl)}</a>. Post it, or put yourself on the leaderboard from the results page.</p>` : "",
      `<p style="margin:16px 0 0;font-size:13px;color:#8a857a">Karen is one of the prospects in ${esc(SITE.name)}. Reps dial prospects built from their own targets, at three levels, and every call is scored like this one. Ten calls are free.</p>`,
      p.personalEmail ? `<p style="margin:12px 0 0;font-size:13px;color:#3b3833">Any address starts the trial. A work address makes the workspace your company's, so your team can join it. Sign up with yours and the five free calls are waiting.</p>` : "",
      `<p style="margin:12px 0 0;font-size:12px;color:#8a857a">We'll send one follow-up in a couple of days. <a href="${p.unsubscribeUrl}" style="color:#8a857a">Don't</a>.</p>`,
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
      "",
      "Your team's reps face these same objections. Build their prospects from your own calls — 5 free calls, no card.",
      ...(p.cameFrom ? [`You came from: ‘${p.cameFrom.text}’. Read how to handle it: ${p.cameFrom.url}`] : []),
      "",
      ...(p.shareUrl ? [`Your public scorecard: ${p.shareUrl}`, ""] : []),
      ...(p.personalEmail ? ["Any address starts the trial. A work address makes the workspace your company's, so your team can join it.", ""] : []),
      `No follow-up: ${p.unsubscribeUrl}`,
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

  partnerApplied(p: { firstName: string; company: string }): Rendered {
    const lines = [`Hi ${p.firstName},`, `Thanks for applying to the ${SITE.name} founding-partner program for ${p.company}.`, "We read every application and reply within two working days. If it's a fit, the next email has your workspace link, already set up from your website, so your reps can dial the same day.", "Nothing to do until then."];
    return { subject: `We got your founding-partner application`, html: layout("Application received.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")), text: textOf(lines) };
  },

  partnerAdminAlert(p: { name: string; email: string; role: string | null; company: string; website: string | null; sdrCount: number; startBy: string; kickoff: string | null; notes: string | null; spotsLeft: number }): Rendered {
    const cta = { label: "Review applications", href: absoluteUrl("/admin/partners") };
    const lines = [
      `${p.name}${p.role ? `, ${p.role}` : ""} at ${p.company} (${p.email}) applied.`,
      `${p.sdrCount} SDRs, wants to start by ${p.startBy}.${p.website ? ` Website: ${p.website}.` : ""}`,
      p.kickoff ? `Asked for a kickoff call: ${p.kickoff}` : "No kickoff call requested.",
      p.notes ? `Their note: ${p.notes}` : "",
      `${p.spotsLeft} of the founding spots are still open.`,
    ].filter(Boolean);
    return { subject: `Founding-partner application: ${p.company}, ${p.sdrCount} SDRs`, html: layout("New partner application.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  partnerApproved(p: { firstName: string; company: string; calls: number; reps: number; days: number; link: string; startWithinDays: number; callsPerRepPerWeek: number; weeks: number }): Rendered {
    const cta = { label: "Open your workspace", href: p.link };
    const lines = [
      `Hi ${p.firstName},`,
      `${p.company} is in. Welcome to the founding-partner program.`,
      `Your workspace is ready: ${p.calls} scored calls over ${p.days} days, enough for ${p.reps} reps at forty calls each. Open the link, choose a password, and invite your reps from the Team page. Your first prospect is already built from your website.`,
      `The deal, as on the page: start within ${p.startWithinDays} days, and each rep makes ${p.callsPerRepPerWeek} calls a week for ${p.weeks} weeks. At day 30 you get a report of how the team's scores moved, and you approve anything before it is published.`,
      "Reply to this email any time. It reaches a person.",
    ];
    const kickoff = bookingUrl("partner_kickoff", "email");
    const foot = `<p style="margin:0 0 12px">Want a kickoff call with the team lead first? <a href="${kickoff}">Pick a time</a>. The pilot runs fine without one.</p>`;
    return { subject: `${p.company} is a ${SITE.name} founding partner`, html: layout("You're a founding partner.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("") + foot, cta), text: textOf([...lines, "", `Kickoff call, if you want one: ${kickoff}`], cta) };
  },

  partnerDeclined(p: { firstName: string; company: string }): Rendered {
    const cta = { label: "Start the free trial", href: absoluteUrl("/signup") };
    const lines = [`Hi ${p.firstName},`, `Thanks for applying with ${p.company}. The founding-partner pilots are for teams of three or more SDRs who can start within two weeks, and this one is not a fit right now.`, `The regular trial is open to you: ${TRIAL.calls} scored calls over ${TRIAL.days} days, no card.`];
    return { subject: "About your founding-partner application", html: layout("Not this round.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  partnerReleased(p: { firstName: string; company: string; days: number }): Rendered {
    const cta = { label: "Make the first call", href: absoluteUrl("/practice") };
    const lines = [`Hi ${p.firstName},`, `${p.company}'s founding-partner spot has been held for ${p.days} days and no practice call has been made, so we have passed it to the next team on the list.`, "Your workspace link and its calls stay valid until the pilot ends. If the timing was just wrong, reply and tell us when you can start."];
    return { subject: "Your founding-partner spot", html: layout("We passed your spot on.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  partnerReport(p: { firstName: string; company: string; summary: string[]; link: string }): Rendered {
    const cta = { label: "Review and approve", href: p.link };
    const lines = [`Hi ${p.firstName},`, `${p.company}'s 30-day pilot is done. Here is what your team's calls show:`, ...p.summary, "Open the link to check the numbers, answer five short questions, and approve what we can publish. Nothing goes out without your approval."];
    return { subject: `${p.company}'s 30-day pilot report`, html: layout("Your pilot, in numbers.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  affiliateWelcome(p: { firstName: string; link: string; sharePercent: number; months: number; minimum: number }): Rendered {
    const lines = [
      `Hi ${p.firstName},`,
      `Your ${SITE.name} affiliate link is ready: ${p.link}`,
      `Anyone who opens it and starts a workspace within ninety days is yours. You earn ${p.sharePercent}% of what they pay for their first ${p.months} months, after VAT and refunds.`,
      `You get one email when a team signs up through your link and one when it first pays. Statements go out on the first Monday of each quarter and are paid within two weeks; balances under $${p.minimum} roll into the next quarter.`,
      "The rules are short: no ads on our brand name, no coupon sites, no spam, no referring yourself. Reply to this email with any question; it reaches a person.",
    ];
    return { subject: `Your ${SITE.name} affiliate link`, html: layout("You're in.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")), text: textOf(lines) };
  },

  affiliateSignup(p: { firstName: string }): Rendered {
    const lines = [`Hi ${p.firstName},`, "A team just signed up through your link. They have a free trial first; you'll get another note when they start paying.", "That's the whole message. Nothing to do."];
    return { subject: "A team signed up through your link", html: layout("Your link worked.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")), text: textOf(lines) };
  },

  affiliateFirstPayment(p: { firstName: string }): Rendered {
    const lines = [`Hi ${p.firstName},`, "A team you referred has made its first payment. Your share lands on your next quarterly statement once the 30-day money-back window has passed.", "Nothing to do."];
    return { subject: "A team you referred is now paying", html: layout("First payment in.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")), text: textOf(lines) };
  },

  affiliateStatement(p: { firstName: string; period: string; lines: string[]; payable: boolean; minimum: number; withinDays: number }): Rendered {
    const body = [
      `Hi ${p.firstName},`,
      `Your ${SITE.name} affiliate statement for ${p.period}:`,
      ...p.lines,
      p.payable ? `Payment goes out within ${p.withinDays} days to the details you gave us. If they have changed, reply to this email before then.` : `Balances under $${p.minimum} carry over, so this one rolls into the next quarter.`,
    ];
    return { subject: `Affiliate statement, ${p.period}`, html: layout("Your statement.", body.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")), text: textOf(body) };
  },

  extensionRequested(p: { name: string; email: string; orgName: string; workEmail: boolean; callsMade: number; answers: [string, string][]; spots: string }): Rendered {
    const cta = { label: "Review the request", href: absoluteUrl("/admin/extensions") };
    const lines = [`${p.name} (${p.email}${p.workEmail ? "" : ", personal address"}) at ${p.orgName} asked for more trial calls after ${p.callsMade} ${p.callsMade === 1 ? "call" : "calls"}.`, ...p.answers.map(([q, a]) => `${q} ${a}`), p.spots];
    return { subject: `Trial extension request: ${p.orgName}`, html: layout("More calls, please.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  extensionApproved(p: { firstName: string; orgName: string; calls: number; days: number }): Rendered {
    const cta = { label: "Make a call", href: absoluteUrl("/practice") };
    const lines = [`Hi ${p.firstName},`, `Done: ${p.calls} more calls and ${p.days} more days on ${p.orgName}'s trial. They are live now.`, "Spend one on the prospect that gave you the most trouble. That is where the score moves."];
    const call = bookingUrl("extension_approved", "email");
    const foot = `<p style="margin:0 0 12px">Weighing a plan for the team? <a href="${call}">Book a 30-minute call</a> and we'll build a prospect from your accounts before it.</p>`;
    return { subject: `${p.calls} more calls on your trial`, html: layout("More calls, as asked.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("") + foot, cta), text: textOf([...lines, "", `Weighing a plan for the team? Book a call: ${call}`], cta) };
  },

  extensionDeclined(p: { firstName: string; note: string | null }): Rendered {
    const cta = { label: "See plans", href: absoluteUrl("/upgrade") };
    const lines = [`Hi ${p.firstName},`, "Thanks for asking about more trial calls. We can't add them this time.", ...(p.note ? [p.note] : []), "The Rewards page has a few ways to earn calls today, and a plan starts the team dialling again in a minute."];
    return { subject: "About your trial extension", html: layout("Not this time.", lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join(""), cta), text: textOf(lines, cta) };
  },

  /** Sent in the rep's name, once, to the manager they chose. The body is the exact text the rep approved. */
  managerIntro(p: { subject: string; lines: string[]; repName: string; repEmail: string; link: string; optOut: string }): Rendered {
    const cta = { label: "Start the free trial", href: p.link };
    const footer = `Sent on behalf of ${p.repName} (${p.repEmail}); replies go to them. One email, no follow-ups.`;
    const html = layout("Your rep has been practising.", `${p.lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")}<p style="margin:20px 0 0;font-size:12px;color:#8a857a">${esc(footer)} <a href="${p.optOut}" style="color:#8a857a">Don't email me again</a>.</p>`, cta);
    return { subject: p.subject, html, text: textOf([...p.lines, "", footer, `Don't email me again: ${p.optOut}`], cta) };
  },
};
