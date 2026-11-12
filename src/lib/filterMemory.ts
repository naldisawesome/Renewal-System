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
