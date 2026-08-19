/**
 * Splits a single "full name" string into firstName/lastName. Only used by
 * the env-var-driven bootstrap scripts (prisma/seed.ts, the /api/setup/seed-admin
 * route) which only ever had one SEED_ADMIN_NAME value to work with. Every
 * user-facing form (Add User, Edit User, Register) collects firstName and
 * lastName directly and never needs this.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed || "User", lastName: "-" };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1),
  };
}
