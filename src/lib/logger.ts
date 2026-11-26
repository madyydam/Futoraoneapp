/**
 * Environment-aware, secret-scrubbing application logger.
 * Silent in production builds so internal URLs, IDs, and stack traces never leak to browser DevTools.
 */

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/https:\/\/[a-z0-9-]+\.supabase\.co[^\s"']*/gi, "[redacted-endpoint]"],
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[redacted-token]"],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[id]"],
];

export function redactSensitiveText(input: string): string {
  let out = input;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const isDev = Boolean(import.meta.env?.DEV);

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(...args);
    }
  },
  info(...args: unknown[]): void {
    if (isDev) {
      console.info(...args);
    }
  },
  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn(...args);
    }
  },
  error(...args: unknown[]): void {
    if (isDev) {
      console.error(...args);
    }
  },
};
