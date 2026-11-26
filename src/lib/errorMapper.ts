/**
 * Maps internal Supabase, PostgREST, Auth, Edge Function, and network errors
 * into clean, user-friendly messages without leaking SQL constraints, UUIDs,
 * project refs, or internal endpoints.
 */

interface ErrorLike {
  code?: string;
  status?: number;
  message?: string;
}

const INTERNAL_LEAK_RE =
  /supabase\.co|violates|constraint|relation\s+"|column\s+"|functions\/v1|pgrst|postgres|jwt|apikey|service_role/i;

export function toSafeUserError(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!error) return fallback;

  const err = (typeof error === "object" ? error : { message: String(error) }) as ErrorLike;
  const code = String(err.code ?? "").trim();
  const msg = String(err.message ?? "").trim();
  const lower = msg.toLowerCase();

  // PostgreSQL / PostgREST error codes
  if (code === "23505" || lower.includes("duplicate key")) {
    return "This record already exists.";
  }
  if (code === "23503" || lower.includes("foreign key constraint")) {
    return "Unable to complete action right now. Please refresh and try again.";
  }
  if (code === "42501" || lower.includes("permission denied") || lower.includes("row-level security")) {
    return "You do not have permission to perform this action.";
  }
  if (code === "PGRST301" || err.status === 401 || lower.includes("jwt expired")) {
    return "Your session expired. Please sign in again.";
  }
  if (err.status === 429 || lower.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Supabase Auth messages (preserve user-actionable ones cleanly)
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }

  // Network / Offline / Edge Function transport errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("failed to send a request to the edge function") ||
    lower.includes("edge function returned a non-2xx")
  ) {
    return "Connection issue. Please check your internet and try again.";
  }

  // Never expose raw DB/Supabase/internal implementation details
  if (!msg || INTERNAL_LEAK_RE.test(msg)) {
    return fallback;
  }

  // Safe short validation error (e.g. client-thrown validation message)
  return msg.length > 160 ? fallback : msg;
}
