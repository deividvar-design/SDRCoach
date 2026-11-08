/**
 * The homepage has its own header, partner bar and footer, drawn on its dark hero and closing band, so it sits
 * outside the (marketing) layout. Like the rest of the public site it ignores the dark preference.
 */
export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.remove('dark')" }} />
      <a href="#content" className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>
      {children}
    </>
  );
}
