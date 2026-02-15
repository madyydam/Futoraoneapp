# 📘 FutoraOne: The Master Documentation (End-to-End)

**Version**: 3.0 (Production Blueprint)
**Status**: Comprehensive / Verified
**Scope**: 100% Platform Coverage

---

## 1️⃣ Executive Vision
**FutoraOne** is a high-performance, gamified professional ecosystem for developers. It bridges the gap between professional networking, real-time social engagement, and competitive gaming.

### Core Value Pillars
1.  **Connect**: Real-time 1:1, Group, and Community messaging with Online Indicators.
2.  **Build**: Gig Marketplace, Project showcases, and AI-driven growth tools.
3.  **Play**: 10+ arcade games with a integrated XP and Coin economy.
4.  **Manage**: A powerful Admin OS with live broadcasting and moderation.

---

## 2️⃣ Architecture & Advanced Tech Stack

| Layer | Technology | Infrastructure Role |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | SPA with granular code-splitting ( manualChunks ). |
| **State** | TanStack Query + Context | Persistent server state with 1-hour GC. |
| **Security** | OpenAI Moderation | AI-powered pre-publication safety scans. |
| **Economy** | Supabase RPC + Ledger | Acid-compliant transactions for Coins and XP. |
| **PWA** | Vite-PWA + Workbox | Offline-ready with StaleWhileRevalidate strategies. |
| **Real-time** | Supabase WebSockets | Live typing, presence, and broadcast overlays. |
| **Engagement** | Firebase (FCM) | Cross-platform push notifications. |

---

## 3️⃣ Systems & Features Deep Dive

### A. The Professional & Matching Suite
*   **Gig Marketplace** (`/gig-marketplace`): Freelance hub with dynamic filtering and application tracking.
*   **Tech Match** (`/tech-match`): Intelligent discovery for co-founders. Matches appear in Messages with unique **Pink Branding** and heart icons.
*   **Founders Corner**: Verified-only lounge for platform entrepreneurs.

### B. Messaging & Real-time Social
*   **Messaging Engine**:
    *   **Direct & Group**: 1:1 and topic-based chats with real-time sync.
    *   **Communities**: Large-scale channel-based discussions.
    *   **Advanced UX**: Pinning, Archiving, Unread Badges, and Real-time Typing Indicators.
*   **Broadcast System**:
    *   **Logic**: Real-time overlay that triggers on `INSERT` to `broadcast_messages`.
    *   **Targeting**: Segmented by `all`, `new_users`, or `existing_users`.
    *   **Persistence**: Tracks `seen` status in `user_popup_status` to prevent duplicate popups.

### C. The Gaming & Economy Engine
*   **Economy (Coins & XP)**:
    *   **Wallet**: Every user has a `native_wallet` and a `native_transactions` ledger.
    *   **Rewards**: Winning games (TicTacToe, CodeDuel, etc.) triggers `process_game_win` RPC.
    *   **XP Progression**: Cumulative XP tracked in `profiles` for leveling and leaderboard ranking.
*   **Leaderboards**: Weekly and All-time boards driven by realtime score updates.

### D. Safety & Moderation Suite
*   **Reporting**: Anonymous reporting for Posts/Users via `/src/components/ReportDialog.tsx`.
*   **Blocking**: Bidirectional blocking that removes content from the feed logic.
*   **AI Moderation**: `moderate-content` Edge Function scans all new posts for policy violations before storage.

### E. Theme & UX Customization
*   **Theme Provider**: Multi-mode support (Light, Dark, System) with persistent storage in `localStorage`.
*   **PWA Shell**: Custom Shortcuts (Feed, Create, Mentor), maskable icons, and iOS status bar transparency.

---

## 4️⃣ The Admin Operating System (`/admin`)

| Module | Purpose | Impact |
| :--- | :--- | :--- |
| **Dashboard** | Command Center | Live telemetry of all system metrics. |
| **Reports** | Community Safety | The front-line for resolving user-flagged content. |
| **Coins** | Economy Control | Direct manipulation of user balances and ledgers. |
| **Popups** | Live Broadcasts | Instant push of message overlays to all active clients. |
| **Moderation**| Global Hub | Overseeing all community engagement and interactions. |

---

## 5️⃣ Database Schema (Unified Blueprint)

### Core & Safety
- `profiles`: Primary identity table (XP, Wins, Bio, Tech Stack).
- `reports`: Tracks ID, Target, Reason, Status (Pending, Resolved).
- `blocks`: `(blocker_id, blocked_id)` index for high-speed feed filtering.

### Messaging & Popups
- `conversations` / `messages`: Core chat infrastructure.
- `broadcast_messages`: Stores live popup content, types, and targeting rules.
- `user_popup_status`: Persistence layer for "seen" popups per user.

### Economy (Ledger System)
- `native_wallets`: Current balance and metadata.
- `native_transactions`: Immutable history of all coin movements (Wins, Tips, Purchases).

---

## 6️⃣ Critical End-to-End Workflows

### 1. The "Safety Loop"
- **User Action**: Finds bad content -> Report Dialog.
- **System Action**: AI Content Moderation autoscans -> Flags for review.
- **Admin Action**: Resolves report in `/admin/reports` -> content removed.

### 2. The "Broadcast Overlay" Flow
1. Admin inserts into `broadcast_messages`.
2. `useBroadcastPopup` hook detects change via Realtime.
3. Popup animates into view on client (if not on protected page).

### 3. The "Earn & Spend" Flow
1. Game Win -> `process_game_win` RPC -> Updates `native_wallet` + inserts into `native_transactions`.

---

## 7️⃣ Deployment & Maintenance Guide

### Updating the PWA
- Assets: `public/app-icon.png`, `public/favicon.png`.
- Logic: `vite.config.ts` (PWA Plugin settings).

### Adding New Features
1. **Schema**: Add to Supabase with appropriate RLS policies.
2. **Logic**: Use `hooks/` for shared business logic.
3. **Admin**: Register new management routes in `src/App.tsx`.

---
*Documented and verified against the FutoraOne production codebase as of February 2026.*
