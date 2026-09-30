import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", description: "How 100 Dials collects, uses and protects personal data.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const c = SITE.company;
  return (
    <LegalPage title="Privacy policy" intro="This policy explains what personal data 100 Dials collects, why, how long we keep it, and the rights you have. It is written to be read, not skimmed.">
      <h2>1. Who we are</h2>
      <p>{c.legalName}, {c.address} (“100 Dials”, “we”) operates the 100 Dials service at {SITE.url}. We are the data controller for the data described in sections 3 and 4, and a data processor for the customer content described in section 5. Contact: <a href={`mailto:${c.privacyEmail}`}>{c.privacyEmail}</a>.</p>

      <h2>2. Scope</h2>
      <p>This policy covers visitors to our website, people who sign up for a trial or subscription, and people who use the service as members of a customer workspace. Where your employer created the workspace, your employer decides why the service is used and is the controller for content you create in it; this policy describes our role as their processor.</p>

      <h2>3. Data we collect on the website</h2>
      <ul>
        <li><strong>Server logs:</strong> IP address, user agent, requested pages, timestamps. Kept for 30 days for security and debugging. Legal basis: legitimate interest in running a secure service.</li>
        <li><strong>Analytics cookies (only with your consent):</strong> pages viewed, referrer, approximate location derived from IP, device type, and interactions such as button clicks. Processed by an analytics provider hosted in the EU. See our <a href="/cookies">cookie policy</a>. Legal basis: consent. You can withdraw it any time from the cookie settings link in the footer.</li>
        <li><strong>Contact:</strong> if you email us, we keep the correspondence for as long as needed to handle it and for up to 24 months afterwards.</li>
      </ul>

      <h2>4. Account data</h2>
      <ul>
        <li><strong>Identity:</strong> name, work email address, password hash, workspace membership and role. Legal basis: performance of a contract.</li>
        <li><strong>Billing:</strong> plan, seats, invoices. Payment card details are handled by our payment provider and never touch our servers.</li>
        <li><strong>Product usage:</strong> calls made, scores, streaks, assignments, and events such as sign-ins. Used to provide the service and, in aggregate, to improve it. Legal basis: contract and legitimate interest.</li>
        <li><strong>Transactional email:</strong> invites, security notices, trial status. These are not marketing and cannot be opted out of while you have an account.</li>
      </ul>

      <h2>5. Customer content: recordings, transcripts and targets</h2>
      <p>When a rep makes a practice call, the audio and its transcript are processed to run the conversation and to score it. When a manager uploads call transcripts, they are processed to extract phrasing, objections and patterns. This content may contain personal data about reps and, in uploaded transcripts, about third parties. Your workspace owner is the controller of this content and is responsible for having a lawful basis to upload it.</p>
      <ul>
        <li>We use this content only to provide the service to your workspace. <strong>We do not use it to train machine-learning models</strong>, and our AI subprocessors are contractually prohibited from doing so.</li>
        <li>Content is isolated per workspace and enforced at the database level.</li>
        <li>Content is deleted when you delete the call, the source, or the workspace, and removed from subprocessors within 30 days.</li>
      </ul>

      <h2>6. Subprocessors and international transfers</h2>
      <p>We use a small number of specialised providers for hosting, real-time voice, call scoring and analytics, each bound by a data processing agreement. The named list is part of our DPA, available on request. Where a provider processes data outside the EEA, transfers rely on the European Commission's Standard Contractual Clauses and, where applicable, the EU-US Data Privacy Framework. A data processing agreement is available on request.</p>

      <h2>7. Retention</h2>
      <table>
        <thead><tr><th>Data</th><th>Retention</th></tr></thead>
        <tbody>
          <tr><td>Server logs</td><td>30 days</td></tr>
          <tr><td>Analytics (with consent)</td><td>12 months</td></tr>
          <tr><td>Account data</td><td>Life of the account, then 90 days</td></tr>
          <tr><td>Recordings and transcripts</td><td>Life of the workspace, or until deleted</td></tr>
          <tr><td>Invoices</td><td>10 years (statutory)</td></tr>
        </tbody>
      </table>

      <h2>8. Your rights</h2>
      <p>Under the GDPR you can ask us to access, correct, delete, restrict or export your personal data, and you can object to processing based on legitimate interest. Email <a href={`mailto:${c.privacyEmail}`}>{c.privacyEmail}</a>; we respond within 30 days. If you are a member of a customer workspace, we may refer your request to your workspace owner where they are the controller. You can complain to your local supervisory authority; ours is the State Data Protection Inspectorate of {c.country}.</p>

      <h2>9. Security</h2>
      <p>Encryption in transit and at rest, per-workspace isolation, least-privilege access for staff, and logged support access. Details on the <a href="/trust">trust page</a>. If we learn of a breach affecting your data we will notify you without undue delay.</p>

      <h2>10. Children</h2>
      <p>The service is for business use by adults. We do not knowingly collect data from anyone under 16.</p>

      <h2>11. Changes</h2>
      <p>We will post changes here and, for material changes, email workspace owners at least 14 days in advance.</p>
    </LegalPage>
  );
}
