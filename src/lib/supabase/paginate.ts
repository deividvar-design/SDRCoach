/**
 * PostgREST returns at most 1,000 rows per request and truncates silently. Any query that can grow with the
 * workspace (sessions, scores, usage) walks the pages through this.
 */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>, size = 1000, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const { data } = await page(from, from + size - 1);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}
