import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockSignOut,
  mockSignInWithOAuth,
  mockRefreshSession,
  mockFrom,
  mockRpc,
  mockClearUserSessionStorage,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockClearUserSessionStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
      signInWithOAuth: mockSignInWithOAuth,
      refreshSession: mockRefreshSession,
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: mockFrom,
    rpc: mockRpc,
  },
}));

vi.mock("@/lib/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security")>();
  return {
    ...actual,
    clearUserSessionStorage: mockClearUserSessionStorage,
  };
});

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/AdminRoute";
import { OpportunitySection } from "@/components/explore/OpportunitySection";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { UserSearchDialog } from "@/components/chat/UserSearchDialog";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { useGameReward } from "@/hooks/useGameReward";

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return { queryClient };
}

describe("Auth, RBAC, and Economy invariants", () => {
  let isAdminRoleMock = false;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    isAdminRoleMock = false;

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "https://accounts.google.com" }, error: null });
    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1", email: "user@example.com" },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1", email: "user@example.com" },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: isAdminRoleMock ? { role: "admin" } : null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { is_banned: false, is_tech_match_unlocked: false },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "user_feature_unlocks") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      };
    });
  });

  it("blocks non-admin authenticated users from AdminRoute", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    const { queryClient } = createQueryWrapper();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <Routes>
              <Route path="/admin/login" element={<div>Admin Login Redirect</div>} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/dashboard" element={<div>Secret Admin Dashboard</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Login Redirect")).toBeInTheDocument();
    });
    expect(screen.queryByText("Secret Admin Dashboard")).not.toBeInTheDocument();
  });

  it("allows verified user_roles admins into AdminRoute", async () => {
    isAdminRoleMock = true;
    const { queryClient } = createQueryWrapper();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <Routes>
              <Route path="/admin/login" element={<div>Admin Login Redirect</div>} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/dashboard" element={<div>Secret Admin Dashboard</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Secret Admin Dashboard")).toBeInTheDocument();
    });
  });

  it("purges storage and caches when switching accounts", async () => {
    let authCallback: ((event: string, session: any) => Promise<void> | void) | null = null;
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { queryClient } = createQueryWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div>Child</div>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());

    await act(async () => {
      await authCallback?.("SIGNED_IN", { user: { id: "user-2", email: "second@example.com" } });
    });

    expect(mockClearUserSessionStorage).toHaveBeenCalledTimes(1);
  });

  it("ignores forged localStorage techMatchUnlocked and invokes unlock_feature RPC", async () => {
    localStorage.setItem("techMatchUnlocked", "true");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockRpc.mockResolvedValue({ data: { unlocked: true, new_balance: 0 }, error: null });

    const onNavigate = vi.fn();
    const { queryClient } = createQueryWrapper();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OpportunitySection onNavigate={onNavigate} />
        </AuthProvider>
      </QueryClientProvider>
    );

    const unlockButton = await screen.findByRole("button", { name: /^Unlock$/i });
    fireEvent.click(unlockButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        "unlock_feature",
        expect.objectContaining({
          p_feature_name: "tech_match",
        })
      );
    });
    expect(onNavigate).toHaveBeenCalledWith("/tech-match");
  });

  it("calls server-authoritative process_game_win RPC with idempotency key", async () => {
    mockRpc.mockResolvedValue({ data: { total_wins: 10 }, error: null });
    const { queryClient } = createQueryWrapper();

    const GameButton = () => {
      const { triggerWinReward } = useGameReward("tic-tac-toe");
      return <button onClick={() => triggerWinReward()}>Win Game</button>;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GameButton />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Win Game"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        "process_game_win",
        expect.objectContaining({
          p_game_key: "tic-tac-toe",
          p_idempotency_key: expect.any(String),
        })
      );
    });
  });

  it("refreshes expiring tokens on session recovery without losing user context", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: "user-1", email: "user@example.com" },
          expires_at: Math.floor(Date.now() / 1000) + 30,
        },
      },
    });
    const { queryClient } = createQueryWrapper();

    const RefreshButton = () => {
      const { refreshSession } = useAuth();
      return <button onClick={() => refreshSession()}>Refresh</button>;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RefreshButton />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: "user-1", email: "user@example.com" },
          expires_at: Math.floor(Date.now() / 1000) + 30,
        },
      },
    });

    fireEvent.click(screen.getByText("Refresh"));
    await waitFor(() => expect(mockRefreshSession).toHaveBeenCalledTimes(1));
  });

  it("blocks javascript: URIs in ProfileHeader social links", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const { queryClient } = createQueryWrapper();

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <ProfileHeader
              profile={{
                id: "u-2",
                username: "dev2",
                full_name: "Dev Two",
                github_url: "javascript:alert(1)",
                linkedin_url: "https://linkedin.com/in/dev2",
              }}
              currentUser={{ id: "u-1" }}
              userId="u-2"
              mutualCount={0}
              isAdmin={false}
              isBlocked={false}
              onFollowChange={vi.fn()}
              onMutualClick={vi.fn()}
              onVerifyUser={vi.fn()}
              onRemoveVerification={vi.fn()}
              onBlockUser={vi.fn()}
              onUnblockUser={vi.fn()}
            />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const buttons = Array.from(container.querySelectorAll("button"));
    // Click all ghost icon social buttons — only the valid https LinkedIn URL should open
    buttons.forEach((btn) => fireEvent.click(btn));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      "https://linkedin.com/in/dev2",
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });

  it("sanitizes PostgREST filter characters in UserSearchDialog queries", async () => {
    const neqSpy = vi.fn().mockReturnValue({
      limit: async () => ({ data: [], error: null }),
    });
    const orSpy = vi.fn().mockReturnValue({
      neq: neqSpy,
      limit: async () => ({ data: [], error: null }),
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            or: orSpy,
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    });

    const { queryClient } = createQueryWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <UserSearchDialog open={true} onOpenChange={vi.fn()} currentUserId="user-1" />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const input = screen.getByPlaceholderText("Search people...");
    fireEvent.change(input, { target: { value: "alice,id.eq.1,(admin)*%" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(orSpy).toHaveBeenCalledWith(
        "username.ilike.%alice id.eq.1 admin%,full_name.ilike.%alice id.eq.1 admin%"
      );
      expect(neqSpy).toHaveBeenCalledWith("id", "user-1");
    });
  });

  it("does not attach invalid neq filter when currentUserId is undefined in UserSearchDialog", async () => {
    const neqSpy = vi.fn();
    const limitSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const orSpy = vi.fn().mockReturnValue({
      neq: neqSpy,
      limit: limitSpy,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            or: orSpy,
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    });

    const { queryClient } = createQueryWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter>
            <UserSearchDialog open={true} onOpenChange={vi.fn()} currentUserId={undefined} />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const input = screen.getByPlaceholderText("Search people...");
    fireEvent.change(input, { target: { value: "bob" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(orSpy).toHaveBeenCalledWith("username.ilike.%bob%,full_name.ilike.%bob%");
      expect(neqSpy).not.toHaveBeenCalled();
      expect(limitSpy).toHaveBeenCalledWith(10);
    });
  });

  it("initiates Supabase Google OAuth flow on Continue with Google click", async () => {
    const { queryClient } = createQueryWrapper();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GoogleSignInButton redirectPath="/auth" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
    });
  });

  it("renders top-tab PWA install banner on beforeinstallprompt and prompts on click", async () => {
    localStorage.removeItem("pwa-dismissed");
    render(<InstallPrompt />);

    const mockPrompt = vi.fn();
    const event = new Event("beforeinstallprompt") as any;
    event.prompt = mockPrompt;
    event.userChoice = Promise.resolve({ outcome: "accepted" });

    act(() => {
      window.dispatchEvent(event);
    });

    const installButton = await screen.findByRole("button", { name: /^Install$/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);
    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });
});
