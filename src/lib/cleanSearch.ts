/**
 * Tidies what someone types or pastes into a search: trims it, and drops a leading "Policy" / "Policy number" /
 * "Policy no." label that comes along when a policy number is copied from a page or an email.
 */
export function cleanSearch(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^policy(\s*(number|no\.?|#))?\s*[:#-]?\s*(?=[A-Za-z0-9])/i, (m, _g, _n, offset, whole) => {
      // Keep it when "Policy" is the start of a word in a client's name ("Policyholders Ltd").
      const rest = whole.slice(m.length);
      return /\d/.test(rest.split(" ")[0] ?? "") ? "" : m;
    })
    .slice(0, 80);
}
