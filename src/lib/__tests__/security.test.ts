import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  sanitizeExternalUrl,
  sanitizePostgrestSearch,
  clearUserSessionStorage,
  withRetry,
} from "@/lib/security";
import { toSafeUserError } from "@/lib/errorMapper";
import { redactSensitiveText } from "@/lib/logger";

vi.mock("@/utils/cache", () => ({
  clearCache: vi.fn().mockResolvedValue(undefined),
}));

describe("security helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("sanitizeExternalUrl", () => {
    it("allows valid http and https URLs", () => {
      expect(sanitizeExternalUrl("https://github.com/futora")).toBe("https://github.com/futora");
      expect(sanitizeExternalUrl("  http://example.com/path?a=1  ")).toBe("http://example.com/path?a=1");
    });

    it("rejects javascript, data, vbscript, and malformed URLs", () => {
      expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeExternalUrl("JAVASCRIPT:alert(document.cookie)")).toBeNull();
      expect(sanitizeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
      expect(sanitizeExternalUrl("vbscript:msgbox(1)")).toBeNull();
      expect(sanitizeExternalUrl("not a url")).toBeNull();
      expect(sanitizeExternalUrl("")).toBeNull();
      expect(sanitizeExternalUrl(null)).toBeNull();
    });
  });

  describe("sanitizePostgrestSearch", () => {
    it("strips PostgREST filter injection characters and bounds length", () => {
      expect(sanitizePostgrestSearch("alice,id.eq.1,(admin)")).toBe("alice id.eq.1 admin");
      expect(sanitizePostgrestSearch("  *dev%test\\  ")).toBe("dev test");
      const long = "a".repeat(150);
      expect(sanitizePostgrestSearch(long).length).toBe(100);
    });
  });

  describe("clearUserSessionStorage", () => {
    it("removes user/session/cache keys while preserving theme preferences", async () => {
      localStorage.setItem("vite-ui-theme", "dark");
      localStorage.setItem("futora_completed_tours", "[]");
      localStorage.setItem("sb-sbzsgeokspmkewrmuqgi-auth-token", "secret-jwt");
      localStorage.setItem("futora_pending_action", "transfer");
      localStorage.setItem("techMatchUnlocked", "true");
      localStorage.setItem("REACT_QUERY_OFFLINE_CACHE", "{}");
      sessionStorage.setItem("draft", "secret");

      await clearUserSessionStorage();

      expect(localStorage.getItem("vite-ui-theme")).toBe("dark");
      expect(localStorage.getItem("futora_completed_tours")).toBe("[]");
      expect(localStorage.getItem("sb-sbzsgeokspmkewrmuqgi-auth-token")).toBeNull();
      expect(localStorage.getItem("futora_pending_action")).toBeNull();
      expect(localStorage.getItem("techMatchUnlocked")).toBeNull();
      expect(localStorage.getItem("REACT_QUERY_OFFLINE_CACHE")).toBeNull();
      expect(sessionStorage.getItem("draft")).toBeNull();
    });
  });

  describe("withRetry", () => {
    it("retries transient failures and succeeds", async () => {
      const op = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error("network glitch"))
        .mockResolvedValueOnce("ok");

      const result = await withRetry(op, { retries: 2, baseDelayMs: 1 });
      expect(result).toBe("ok");
      expect(op).toHaveBeenCalledTimes(2);
    });

    it("throws after exhausting retries", async () => {
      const op = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("down"));
      await expect(withRetry(op, { retries: 1, baseDelayMs: 1 })).rejects.toThrow("down");
      expect(op).toHaveBeenCalledTimes(2);
    });
  });

  describe("toSafeUserError", () => {
    it("masks Postgres constraints, Supabase URLs, and internal tokens", () => {
      expect(
        toSafeUserError({
          code: "23503",
          message: 'insert or update on table "follows" violates foreign key constraint "follows_follower_id_fkey"',
        })
      ).toBe("Unable to complete action right now. Please refresh and try again.");

      expect(
        toSafeUserError({
          message: "Failed at https://sbzsgeokspmkewrmuqgi.supabase.co/functions/v1/send-fcm-notification",
        })
      ).toBe("Something went wrong. Please try again.");

      expect(toSafeUserError({ message: "Edge Function returned a non-2xx status code" })).toBe(
        "Connection issue. Please check your internet and try again."
      );
    });

    it("preserves safe actionable auth messages", () => {
      expect(toSafeUserError({ message: "Invalid login credentials" })).toBe("Invalid email or password.");
    });
  });

  describe("redactSensitiveText", () => {
    it("scrubs Supabase endpoints, JWTs, and UUIDs", () => {
      const raw =
        "POST https://sbzsgeokspmkewrmuqgi.supabase.co/functions/v1/send-email uid=19e992ce-b70e-461a-86b2-f1d89351e30a jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123";
      const scrubbed = redactSensitiveText(raw);
      expect(scrubbed).not.toContain("sbzsgeokspmkewrmuqgi");
      expect(scrubbed).not.toContain("19e992ce");
      expect(scrubbed).not.toContain("eyJhbGci");
      expect(scrubbed).toContain("[redacted-endpoint]");
      expect(scrubbed).toContain("[id]");
      expect(scrubbed).toContain("[redacted-token]");
    });
  });
});
