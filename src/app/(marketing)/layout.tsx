import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="marketing flex min-h-dvh flex-col">
      {/* The public site is designed cream-and-ink and ignores the dark preference. Runs before the page paints. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.remove('dark')" }} />
      <a href="#content" className="bg-foreground text-background sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      <MarketingHeader />
      <main id="content" className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
