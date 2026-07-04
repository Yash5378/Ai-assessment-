/**
 * Builds a query string from a filters object, skipping blank values.
 * Returns '' when no filter is set, otherwise '?key=value&…'.
 */
export function buildQuery(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (String(value).trim() !== '') params.set(key, String(value).trim());
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
