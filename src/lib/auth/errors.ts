/**
 * Maps Supabase Auth errors to user-facing messages. Pure (no framework imports).
 * Never echoes raw provider messages that could include internals.
 */
export type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

export function authErrorMessage(err: AuthErrorLike, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "Incorrect email or password.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) return "Please confirm your email address first. Check your inbox for the link.";
  if (code === "user_already_exists" || code === "email_exists") return "An account with this email already exists. Try logging in or resetting your password.";
  if (code === "weak_password" || msg.includes("password should")) return "That password is too weak. Use at least 8 characters with letters and numbers.";
  if (code === "same_password") return "Your new password must be different from your current one.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || err.status === 429)
    return "Too many attempts. Please wait a minute and try again.";
  if (code === "signup_disabled") return "New sign-ups are currently turned off.";
  if (code === "email_address_invalid") return "That email address can't be used. Please check it and try again.";
  if (code === "email_address_not_authorized" || msg.includes("not authorized"))
    return "We couldn't send email to that address. The site's email service isn't fully set up yet.";
  if (code === "session_not_found" || code === "session_expired" || code === "refresh_token_not_found")
    return "Your session has expired. Please log in again.";
  if (code === "otp_expired" || msg.includes("expired")) return "This link has expired. Please request a new one.";
  if (code === "provider_disabled" || (code === "validation_failed" && msg.includes("provider")) || msg.includes("provider is not enabled"))
    return "This sign-in method isn't available yet.";
  if (code === "user_banned") return "This account has been suspended.";
  return fallback;
}
