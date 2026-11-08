import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Host_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { NavigationProgress } from "@/components/navigation-progress";
import { PauseOffscreenLight } from "@/components/pause-offscreen-light";
import { ThemeScript } from "@/components/theme/theme-script";
import { AnalyticsProvider } from "@/components/analytics/provider";
import { MarketingTags } from "@/components/analytics/marketing-tags";
import { GoogleTag } from "@/components/analytics/google-tag";
import { CookieBanner } from "@/components/analytics/cookie-banner";
import { ConsentScript } from "@/components/analytics/consent-script";
import { INDEXABLE, SITE } from "@/lib/site";
import "./globals.css";

// The one family, site and app: 400 for text, 600 for headlines.
const host = Host_Grotesk({ variable: "--font-host", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}, AI cold call practice`, template: `%s, ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", siteName: SITE.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { types: { "application/rss+xml": `${SITE.url}/blog/rss.xml` } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eee9df" },
    { media: "(prefers-color-scheme: dark)", color: "#0f161e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${host.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
        <ConsentScript />
        <GoogleTag />
        {/* The viewer's timezone, so streaks and dates are computed for their day, not the server's. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{document.cookie="tz="+Intl.DateTimeFormat().resolvedOptions().timeZone+";path=/;max-age=31536000;samesite=lax"}catch(e){}' }} />
        {/* A referral code (?ref=) is kept the same way, so the workspace created later credits the referrer. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{var r=new URLSearchParams(location.search).get("ref");if(r&&/^[a-z0-9]{6,12}$/.test(r)){document.cookie="ref="+r+";path=/;max-age=7776000;samesite=lax"}}catch(e){}' }} />
        {/* Google Ads click ids survive the visit in a first-party cookie, so a signup or Karen call days later can be matched to the click. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{var q=new URLSearchParams(location.search),o={},k=["gclid","gbraid","wbraid"],h=false;for(var i=0;i<k.length;i++){var v=q.get(k[i]);if(v&&/^[\\w-]{1,200}$/.test(v)){o[k[i]]=v;h=true}}if(h){document.cookie="adclick="+encodeURIComponent(JSON.stringify(o))+";path=/;max-age=7776000;samesite=lax"}}catch(e){}' }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}><NavigationProgress /></Suspense>
        <PauseOffscreenLight />
        {children}
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        {/* Ad pixels and visitor identification: only after "Accept all", only where an id is configured. */}
        <MarketingTags />
        <CookieBanner />
        {/* Cookieless traffic measurement: pages, referrers, countries, campaigns. Runs without consent because it sets nothing on the device. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
