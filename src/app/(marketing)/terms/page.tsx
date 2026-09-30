import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";
import { SITE } from "@/lib/site";
import { TRIAL } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Terms of service", description: "The agreement between 100 Dials and customers using the service.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  const c = SITE.company;
  return (
    <LegalPage title="Terms of service" intro="These terms govern use of 100 Dials. By creating a workspace or accepting an invitation you agree to them on behalf of yourself and, where applicable, your employer.">
      <h2>1. The service</h2>
      <p>100 Dials (provided by {c.legalName}) is a training tool that lets sales representatives practise calls with AI-generated prospects and receive automated coaching. AI output is probabilistic: scores and feedback are guidance, not a measure of employment performance, and you should not use them as the sole basis for personnel decisions.</p>

      <h2>2. Accounts and workspaces</h2>
      <ul>
        <li>You must provide accurate information and keep credentials confidential. You are responsible for activity under your account.</li>
        <li>Self-serve workspaces require a business email address. One trial workspace per company domain.</li>
        <li>The person who creates a workspace (“owner”) can invite members, assign roles, and is the customer of record.</li>
      </ul>

      <h2>3. Trial</h2>
      <p>New workspaces receive a free trial of {TRIAL.calls} connected calls or {TRIAL.days} days, whichever ends first. No payment details are required. At the end of the trial the workspace remains accessible in read-only form for 30 days; calling resumes on a paid plan.</p>

      <h2>4. Plans, fees and payment</h2>
      <ul>
        <li>Fees are per seat per month or per year as shown on the pricing page at the time of purchase, plus overage for calls beyond the plan allowance, billed monthly in arrears.</li>
        <li>Seats can be added at any time and are prorated. Seat reductions take effect at the next renewal.</li>
        <li>Fees are charged in euros or US dollars as chosen at checkout and exclude VAT and similar taxes. Invoices are due within 14 days unless agreed otherwise. Late amounts may suspend the service after notice.</li>
        <li>Prices may change with 30 days' notice; changes apply from your next renewal.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You will not: use the service to harass, deceive or impersonate real people; upload content you have no right to upload, including call recordings made without the consents your jurisdiction requires; attempt to extract our prompts, models or other users' data; resell the service; or use it to build a competing product. We may suspend accounts that breach this section.</p>

      <h2>6. Customer content</h2>
      <p>You own the content you upload and the recordings and transcripts the service generates for you. You grant us a licence to process it solely to provide and secure the service. We do not use it to train models. Our <a href="/privacy">privacy policy</a> and <a href="/trust">trust page</a> describe how we handle it. You are responsible for informing your reps that practice calls are recorded and scored.</p>

      <h2>7. Our intellectual property</h2>
      <p>The service, its personas, rubric, software and branding are ours or our licensors'. These terms grant no rights other than the right to use the service.</p>

      <h2>8. Availability and support</h2>
      <p>We aim for 99.5% monthly availability excluding scheduled maintenance announced in advance. Support is by email; response targets depend on plan. The service depends on third-party voice and language providers and may degrade when they do.</p>

      <h2>9. Termination</h2>
      <p>You can cancel at any time from the workspace settings or by email. The first payment on a new subscription is refunded in full if you ask within 30 days of it, for any reason; later payments are not refunded except where required by law. We may terminate for material breach after 14 days' notice to cure, or immediately for breaches of section 5. On termination you may export your data for 30 days, after which it is deleted.</p>

      <h2>10. Warranties and liability</h2>
      <p>The service is provided “as is”. To the extent permitted by law, we exclude implied warranties and our total liability under these terms in any 12-month period is limited to the fees you paid in that period. Neither party is liable for indirect or consequential loss. Nothing limits liability for fraud, wilful misconduct, or where it cannot be limited by law.</p>

      <h2>11. Data protection</h2>
      <p>Where you upload personal data, we act as your processor under our data processing agreement, which forms part of these terms and is available on request.</p>

      <h2>12. General</h2>
      <p>These terms are governed by the laws of {c.country}, and disputes go to the courts of Vilnius, without prejudice to mandatory consumer protections where they apply. If any provision is unenforceable the rest remains in force. These terms, the pricing page and the DPA are the entire agreement. We may update these terms with 30 days' notice by email to workspace owners.</p>

      <p>Questions: <a href={`mailto:${c.email}`}>{c.email}</a>.</p>
    </LegalPage>
  );
}
