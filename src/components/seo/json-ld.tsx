import { SITE, absoluteUrl } from "@/lib/site";
import { PLANS, TRIAL } from "@/lib/billing/plans";

type Ld = Record<string, unknown>;

export function JsonLd({ data }: { data: Ld | Ld[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
    </>
  );
}

export function organizationLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/logo.png"),
    legalName: SITE.company.legalName,
    foundingDate: "2026",
    ...(SITE.company.address ? { address: { "@type": "PostalAddress", streetAddress: SITE.company.address, addressCountry: "LT" } } : {}),
    contactPoint: [{ "@type": "ContactPoint", email: SITE.company.email, contactType: "sales" }],
  };
}

export function softwareLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SITE.description,
    url: SITE.url,
    offers: [
      ...PLANS.flatMap((p) => (p.prices ? [{
        "@type": "Offer",
        name: `${p.name}, per seat per month`,
        price: String(p.prices.usd.month),
        priceCurrency: "USD",
        description: `${p.callsPerSeat} calls per seat per month`,
        url: absoluteUrl("/pricing"),
      }] : [])),
      { "@type": "Offer", name: "Free trial", price: "0", priceCurrency: "USD", description: `${TRIAL.calls} calls over ${TRIAL.days} days, no card` },
    ],
  };
}

export function faqLd(items: readonly { q: string; a: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

export function articleLd(p: { title: string; description: string; slug: string; date: string; updated?: string; author: string; path?: string; image: string }): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    dateModified: p.updated ?? p.date,
    author: p.author === SITE.name ? { "@type": "Organization", name: SITE.name, url: SITE.url } : { "@type": "Person", name: p.author },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") } },
    mainEntityOfPage: absoluteUrl(p.path ?? `/blog/${p.slug}`),
    image: absoluteUrl(p.image),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
