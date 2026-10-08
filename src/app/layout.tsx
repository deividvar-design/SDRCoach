import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeScript } from "@/components/theme/theme-script";
import { AnalyticsProvider } from "@/components/analytics/provider";
import { CookieBanner } from "@/components/analytics/cookie-banner";
import { INDEXABLE, SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}, ${SITE.descriptor}`, template: `%s, ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", siteName: SITE.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  alternates: { types: { "application/rss+xml": `${SITE.url}/blog/rss.xml` } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
        {/* The viewer's timezone, so streaks and dates are computed for their day, not the server's. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{document.cookie="tz="+Intl.DateTimeFormat().resolvedOptions().timeZone+";path=/;max-age=31536000;samesite=lax"}catch(e){}' }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" />
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <CookieBanner />
        {/* Cookieless traffic measurement: pages, referrers, countries, campaigns. Runs without consent because it sets nothing on the device. */}
        <Analytics />
      </body>
    </html>
  );
}
