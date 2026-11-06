import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { StickyKarenBar } from "@/components/marketing/sticky-karen-bar";
import { PartnerBar, PartnerBarScript } from "@/components/marketing/partner-bar";
import { cachedSpotsLeft } from "@/lib/partners/spots";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const spots = await cachedSpotsLeft();
  return (
    <div className="marketing flex min-h-dvh flex-col">
      {/* The public site is designed cream-and-ink and ignores the dark preference. Runs before the page paints. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.remove('dark')" }} />
      <a href="#content" className="bg-foreground text-background sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <PartnerBarScript />
      <PartnerBar spots={spots} />
      <MarketingHeader />
      <main id="content" className="flex-1">{children}</main>
      <MarketingFooter />
      {/* Phones, content pages only: the free call, once the reader has scrolled a quarter of the page. */}
      <StickyKarenBar />
    </div>
  );
}
