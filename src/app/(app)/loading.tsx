export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="bg-muted h-3 w-40 animate-pulse rounded" />
        <div className="bg-muted h-9 w-72 animate-pulse rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-card h-28 animate-pulse rounded-2xl border" />
        ))}
      </div>
      <div className="bg-card h-64 animate-pulse rounded-2xl border" />
    </div>
  );
}
