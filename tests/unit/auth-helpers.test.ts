// Unit tests for framework-free auth helpers. Run: pnpm test:unit (node --test, native TS stripping).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isProtectedPath, loginRedirectPath, safeNextPath } from "../../src/lib/auth/redirects.ts";
import { applyRememberPreference, hasSupabaseAuthCookie } from "../../src/lib/auth/cookies.ts";
import { authErrorMessage } from "../../src/lib/auth/errors.ts";

test("safeNextPath keeps safe internal paths (with query and hash)", () => {
  assert.equal(safeNextPath("/discover"), "/discover");
  assert.equal(safeNextPath("/requests/abc?tab=story#top"), "/requests/abc?tab=story#top");
  assert.equal(safeNextPath("%2Fdashboard%2Frequester"), "/dashboard/requester");
});

test("safeNextPath blocks open redirects", () => {
  const evil = [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "%2F%2Fevil.example",
    "/%2F%2Fevil.example",
    "javascript:alert(1)",
    "/%0d%0aSet-Cookie:x=1",
    "/\u0000x",
    "evil.example/path",
    "",
    "   ",
    "/" + "a".repeat(600),
  ];
  for (const e of evil) {
    const out = safeNextPath(e, "/fallback");
    assert.ok(out === "/fallback" || (out.startsWith("/") && !out.startsWith("//")), `unsafe result for ${JSON.stringify(e)}: ${out}`);
    assert.ok(!/evil\.example/.test(new URL(out, "http://app.local").host), `escaped origin for ${JSON.stringify(e)}`);
  }
  assert.equal(safeNextPath("//evil.example", "/x"), "/x");
  assert.equal(safeNextPath("https://evil.example", "/x"), "/x");
  assert.equal(safeNextPath(undefined, "/x"), "/x");
  assert.equal(safeNextPath(42, "/x"), "/x");
});

test("safeNextPath never returns into auth callbacks", () => {
  assert.equal(safeNextPath("/auth/callback?code=abc", "/x"), "/x");
  assert.equal(safeNextPath("/auth/confirm", "/x"), "/x");
});

test("protected paths", () => {
  for (const p of ["/dashboard", "/dashboard/donor", "/discover", "/submit", "/profile", "/saved", "/notifications", "/admin", "/admin/users", "/onboarding"]) {
    assert.ok(isProtectedPath(p), p);
  }
  for (const p of ["/", "/login", "/signup", "/explore", "/requests/abc", "/discovery", "/admins", "/auth/callback"]) {
    assert.ok(!isProtectedPath(p), p);
  }
  assert.equal(loginRedirectPath("/admin/users", { expired: true }), "/login?next=%2Fadmin%2Fusers&reason=expired");
});

test("remember-me strips persistence only when not remembered", () => {
  const opts = { maxAge: 100, expires: new Date(), path: "/", sameSite: "lax" };
  assert.deepEqual(applyRememberPreference(opts, true), opts);
  const session = applyRememberPreference(opts, false)!;
  assert.equal(session.maxAge, undefined);
  assert.equal(session.expires, undefined);
  assert.equal(session.path, "/");
  // Deletions (maxAge 0) must survive so sign-out still clears cookies.
  assert.equal(applyRememberPreference({ maxAge: 0 }, false)!.maxAge, 0);
});

test("detects Supabase auth cookies (for expired-session messaging)", () => {
  assert.ok(hasSupabaseAuthCookie(["sb-abc-auth-token"]));
  assert.ok(hasSupabaseAuthCookie(["x", "sb-abc-auth-token.0"]));
  assert.ok(!hasSupabaseAuthCookie(["bs_demo", "theme"]));
});

test("auth errors map to friendly messages without leaking details", () => {
  assert.equal(authErrorMessage({ code: "invalid_credentials" }), "Incorrect email or password.");
  assert.match(authErrorMessage({ code: "email_not_confirmed" }), /confirm your email/);
  assert.match(authErrorMessage({ code: "weak_password" }), /too weak/);
  assert.match(authErrorMessage({ status: 429 }), /Too many attempts/);
  assert.match(authErrorMessage({ code: "user_banned" }), /suspended/);
  assert.equal(authErrorMessage({ code: "something_new", message: "internal db detail" }), "Something went wrong. Please try again.");
  assert.equal(authErrorMessage(null, "fallback"), "fallback");
});
