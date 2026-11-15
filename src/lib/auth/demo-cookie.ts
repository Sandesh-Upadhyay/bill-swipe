import { DEMO_COOKIE } from "./cookies";

/**
 * Marks (or clears) an explicit demo session in the browser. The server only uses this to
 * let demo pages render; it grants no access to any real account or data.
 */
export function setDemoCookie(on: boolean) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = on
    ? `${DEMO_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
    : `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function hasDemoCookie() {
  return typeof document !== "undefined" && document.cookie.split("; ").some((c) => c === `${DEMO_COOKIE}=1`);
}
