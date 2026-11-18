export const FILTER_COOKIE = "rs-renewals-filters";
export const REMEMBERED_KEYS = ["q", "company", "bookType", "status", "adviserId", "underwriterId", "salesTeam", "month", "due", "followup"];

/**
 * Turns the remembered-filters cookie value back into search parameters. `saved` is what cookies().get() returns,
 * which is already URL-decoded once, so it is parsed as is: decoding it again would turn an encoded "&", "+" or "="
 * inside a search into a separator and cut the search short.
 */
export function parseRemembered(saved: string): URLSearchParams {
  const usp = new URLSearchParams();
  new URLSearchParams(saved).forEach((v, k) => REMEMBERED_KEYS.includes(k) && v && usp.set(k, v));
  return usp;
}

/** The remembered-filters value for a set of search parameters (only the keys that are remembered). */
export function rememberedQuery(params: URLSearchParams | Record<string, string | undefined>): string {
  const src = params instanceof URLSearchParams ? params : new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
  return new URLSearchParams(REMEMBERED_KEYS.filter((k) => src.get(k)).map((k) => [k, src.get(k) as string] as [string, string])).toString();
}

/**
 * Saves the filters in this browser (client only). Called before moving to another set of filters, so the server
 * already sees the new choice: clearing the filters then really clears them instead of bringing the old ones back.
 */
export function saveFilterMemory(query: string) {
  try {
    document.cookie = `${FILTER_COOKIE}=${encodeURIComponent(query)}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
}
