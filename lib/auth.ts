/**
 * Email allowlist. Only these accounts can access /admin/*.
 *
 * Set ADMIN_EMAILS in your environment as a comma-separated list, e.g.
 *   ADMIN_EMAILS="jcaruana888@gmail.com,rowan@example.com"
 *
 * If unset, the hardcoded fallback below is used. Update the fallback
 * once you confirm Rowan's email so the app is safe even if the env
 * var is missing in some environment.
 */
const FALLBACK_ALLOWLIST = [
  "jcaruana888@gmail.com",
  "rowan111@gmail.com",
];

export function getAllowlist(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return FALLBACK_ALLOWLIST.map((e) => e.toLowerCase());
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.toLowerCase());
}
