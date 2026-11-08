/**
 * The one email frame every message uses: our own (lib/email/templates.ts) and the Supabase auth emails
 * (lib/email/auth-templates.ts, published to supabase/templates). No imports, so the auth templates render the same
 * in a test as on the server.
 *
 * Built for email clients: tables, inline styles, a web font with system fallbacks, nothing that needs CSS support.
 */

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const C = {
  page: "#eee9df",
  card: "#fbfaf7",
  border: "#e2dccf",
  navy: "#1b2632",
  ink: "#1b2632",
  body: "#3d4855",
  muted: "#6b7480",
  amber: "#ffb162",
  dot: "#ff4a1c",
};
const FONT = "'Host Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export interface EmailFrame {
  title: string;
  /** Already-escaped HTML for the body. */
  bodyHtml: string;
  cta?: { label: string; href: string };
  /** Shown under the button as a plain link, for clients that strip buttons. */
  showLink?: boolean;
  /** Inbox preview line. */
  preheader?: string;
  /** Escaped HTML after the button, in smaller type: "ignore this if it wasn't you" and the like. */
  afterHtml?: string;
  footer: { name: string; legalName: string; address?: string; privacyUrl: string };
}

export const paragraph = (s: string) => `<p style="margin:0 0 14px">${esc(s)}</p>`;

export function emailLayout(f: EmailFrame) {
  const footerName = f.footer.legalName && f.footer.legalName !== f.footer.name ? `${esc(f.footer.name)}, ${esc(f.footer.legalName)}` : esc(f.footer.name);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(f.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@400;600&amp;display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT};color:${C.ink};-webkit-font-smoothing:antialiased">
${f.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(f.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.border};border-radius:20px;border-collapse:separate;overflow:hidden">
<tr><td style="background:${C.navy};border-bottom:3px solid ${C.amber};border-radius:19px 19px 0 0;padding:22px 32px">
<span style="font-family:${FONT};font-size:18px;font-weight:600;letter-spacing:-0.2px;color:#ffffff">100 Dials</span><span style="display:inline-block;width:7px;height:7px;margin-left:3px;border-radius:7px;background:${C.dot};vertical-align:top"></span>
</td></tr>
<tr><td style="padding:34px 32px 0;font-family:${FONT};font-size:27px;line-height:1.15;font-weight:600;letter-spacing:-0.6px;color:${C.ink}">${esc(f.title)}</td></tr>
<tr><td style="padding:16px 32px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.body}">${f.bodyHtml}</td></tr>
${
  f.cta
    ? `<tr><td style="padding:12px 32px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.amber};border-radius:999px"><a href="${f.cta.href}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;color:${C.navy};text-decoration:none;border-radius:999px">${esc(f.cta.label)}</a></td></tr></table></td></tr>
${f.showLink ? `<tr><td style="padding:18px 32px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">Button not working? Paste this into your browser:<br><a href="${f.cta.href}" style="color:${C.body};word-break:break-all">${f.cta.href}</a></td></tr>` : ""}`
    : ""
}
${f.afterHtml ? `<tr><td style="padding:22px 32px 0;font-family:${FONT};font-size:13px;line-height:1.55;color:${C.muted}">${f.afterHtml}</td></tr>` : ""}
<tr><td style="padding:30px 32px 0"><div style="height:1px;background:${C.border};line-height:1px;font-size:1px">&nbsp;</div></td></tr>
<tr><td style="padding:16px 32px 28px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">${footerName}. <a href="${f.footer.privacyUrl}" style="color:${C.muted}">Privacy</a>${f.footer.address ? `<div style="margin-top:6px;font-size:11px;color:#8d949d">${esc(f.footer.address)}</div>` : ""}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
