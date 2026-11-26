import { clearCache } from "@/utils/cache";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Validates user-supplied external URLs to block javascript:/data:/vbscript: XSS vectors.
 */
export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Escapes PostgREST filter metacharacters before interpolating into `.or(...)` expressions.
 */
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/[,()\\*%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

const STATIC_PREF_KEYS = new Set(["vite-ui-theme", "futora_completed_tours"]);

/**
 * Removes all user-scoped browser storage (localStorage, sessionStorage, IndexedDB)
 * to prevent cross-account data leaks on shared devices or after logout.
 */
export async function clearUserSessionStorage(): Promise<void> {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || STATIC_PREF_KEYS.has(key)) continue;
      if (
        key.startsWith("sb-") ||
        key.startsWith("futora_") ||
        key === "techMatchUnlocked" ||
        key === "REACT_QUERY_OFFLINE_CACHE"
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("Failed clearing localStorage keys:", err);
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage access errors in restricted contexts
  }

  try {
    await clearCache();
  } catch {
    // Ignore IndexedDB errors if unavailable
  }
}

/**
 * Retries an async operation with exponential backoff for transient network failures.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 300;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
