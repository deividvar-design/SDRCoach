import { emailLayout, esc, paragraph } from "@/lib/email/layout";

/**
 * The emails Supabase Auth sends (confirm signup, password reset and the rest), in the same frame as ours. Supabase
 * fills the {{ .Placeholders }} itself. The rendered files live in supabase/templates (kept in step by
 * auth-templates.test.ts) and `pnpm supabase:emails` uploads them to the project.
 */

const footer = { name: "100 Dials", legalName: "100 Dials", privacyUrl: "https://100dials.com/privacy" };
const ignore = (s: string) => esc(s);

export const AUTH_EMAILS = {
  confirmation: {
    subject: "Confirm your email for 100 Dials",
    html: emailLayout({
      title: "Confirm your email",
      preheader: "One click and your workspace is ready.",
      bodyHtml: paragraph("One click and your 100 Dials workspace is ready. Your first practice call is waiting on the other end."),
      cta: { label: "Confirm email", href: "{{ .ConfirmationURL }}" },
      showLink: true,
      afterHtml: ignore("If you didn't sign up, ignore this email and no account is created."),
      footer,
    }),
  },
  recovery: {
    subject: "Reset your 100 Dials password",
    html: emailLayout({
      title: "Choose a new password",
      preheader: "The link works once.",
      bodyHtml: `<p style="margin:0 0 14px">Someone asked to reset the password for <strong style="color:#1b2632">{{ .Email }}</strong>. Use the button to choose a new one. The link works once.</p>`,
      cta: { label: "Choose a new password", href: "{{ .ConfirmationURL }}" },
      showLink: true,
      afterHtml: ignore("If it wasn't you, ignore this email. Your password stays as it is."),
      footer,
    }),
  },
  magic_link: {
    subject: "Your 100 Dials sign-in link",
    html: emailLayout({
      title: "Sign in to 100 Dials",
      preheader: "Your sign-in link. It works once.",
      bodyHtml: paragraph("Here is your sign-in link. It works once."),
      cta: { label: "Sign in", href: "{{ .ConfirmationURL }}" },
      showLink: true,
      afterHtml: ignore("If you didn't ask to sign in, ignore this email."),
      footer,
    }),
  },
  invite: {
    subject: "You're invited to 100 Dials",
    html: emailLayout({
      title: "You're invited",
      preheader: "Your team practises cold calls on 100 Dials.",
      bodyHtml: paragraph("You've been invited to a 100 Dials workspace, where your team practises cold calls against AI prospects and gets scored on every one."),
      cta: { label: "Accept the invite", href: "{{ .ConfirmationURL }}" },
      showLink: true,
      afterHtml: ignore("Not expecting this? Ignore the email and nothing happens."),
      footer,
    }),
  },
  email_change: {
    subject: "Confirm your new email for 100 Dials",
    html: emailLayout({
      title: "Confirm your new email",
      preheader: "One click to switch your sign-in address.",
      bodyHtml: `<p style="margin:0 0 14px">Confirm that you want to sign in with <strong style="color:#1b2632">{{ .NewEmail }}</strong> instead of {{ .Email }}.</p>`,
      cta: { label: "Confirm new email", href: "{{ .ConfirmationURL }}" },
      showLink: true,
      afterHtml: ignore("If you didn't ask for this, ignore the email and your address stays the same."),
      footer,
    }),
  },
  reauthentication: {
    subject: "Your 100 Dials confirmation code",
    html: emailLayout({
      title: "Your confirmation code",
      preheader: "Enter this code to continue.",
      bodyHtml: `<p style="margin:0 0 14px">Enter this code to continue.</p><p style="margin:4px 0 6px;font-size:34px;font-weight:600;letter-spacing:6px;color:#1b2632">{{ .Token }}</p>`,
      afterHtml: ignore("If you didn't ask for a code, ignore this email."),
      footer,
    }),
  },
} as const;

export type AuthEmailKind = keyof typeof AUTH_EMAILS;
