import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";
import { CookieSettingsLink } from "@/components/analytics/cookie-banner";

export const metadata: Metadata = { title: "Cookie policy", description: "Which cookies 100 Dials sets, what they do, and how to change your choice.", alternates: { canonical: "/cookies" }, openGraph: { url: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie policy" intro="We use a small number of cookies. Only the ones needed to run the service are set without asking. Everything else waits for your choice.">
      <h2>Strictly necessary</h2>
      <p>These cannot be switched off. They keep you signed in and remember your cookie choice itself.</p>
      <table>
        <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>Session cookie</td><td>Keeps you signed in</td><td>Session, refreshed while active</td></tr>
          <tr><td><code>cookie-consent</code> (local storage)</td><td>Remembers whether you accepted analytics</td><td>12 months</td></tr>
          <tr><td><code>theme</code> (local storage)</td><td>Light or dark preference if you set one</td><td>Until cleared</td></tr>
          <tr><td><code>tz</code></td><td>Your timezone, so dates and streaks are shown for your day</td><td>12 months</td></tr>
          <tr><td><code>currency</code></td><td>Whether you chose to see prices in euros or dollars</td><td>12 months</td></tr>
        </tbody>
      </table>

      <h2>Traffic measurement (no cookies)</h2>
      <p>We count page views with Vercel Web Analytics, which is built into the platform that hosts this site. It sets no cookie and stores nothing on your device. It records the page, the referring site, the country, the device type and any campaign tag in the link, and it derives a short-lived anonymous identifier from the request that is discarded after the visit and cannot identify you. This runs without asking because it does not touch your device.</p>

      <h2>Analytics (with consent)</h2>
      <p>If you accept, we load an analytics tool hosted in the EU to understand which pages and features are used and where people get stuck. No advertising, no cross-site tracking, no data sold.</p>
      <table>
        <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>Analytics cookies</td><td>Anonymous visitor id and session</td><td>12 months</td></tr>
        </tbody>
      </table>

      <h2>Change your mind</h2>
      <p>Open <CookieSettingsLink /> at any time. Rejecting analytics removes those cookies on your next page load. You can also block cookies in your browser; the service still works, you will just be signed out more often.</p>
    </LegalPage>
  );
}
