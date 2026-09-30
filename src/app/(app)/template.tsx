/** Re-mounts on every navigation, so each page rises into place. Reduced motion disables it in CSS. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
