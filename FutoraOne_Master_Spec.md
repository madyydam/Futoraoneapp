# 📘 FutoraOne: The Master Documentation

**Version**: 2.0 (End-to-End Analysis)
**Status**: Production Ready
**Scope**: 100% Codebase Coverage

---

## 1️⃣ Executive Vision

**FutoraOne** is not just a social network; it is a **gamified professional ecosystem** for developers. It merges the professional networking of LinkedIn, the visual engagement of Instagram, and the competitive fun of a gaming arcade into a single "Super App" for the tech community.

### Core Value Pillars
1.  **Connect**: Real-time chat, group discussions, and "Tech Match" for finding co-founders.
2.  **Build**: Project showcases, Gig Marketplace for freelancing, and AI-powered roadmaps.
3.  **Play**: A full arcade of 10+ games, leaderboards, XP systems, and coin rewards.
4.  **Manage**: A comprehensive Admin OS to oversee users, finance, and content.

---

## 2️⃣ Architecture & Tech Stack

The application relies on a **Serverless, Event-Driven Architecture**.

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | High-performance SPA with instant HMR. |
| **State** | TanStack Query + Context | Server state caching (1hr GC) & Real-time presence. |
| **Styling** | Tailwind CSS + Shadcn/UI | Premium, responsive, dark-mode first design. |
| **Backend** | Supabase (PostgreSQL) | Auth, Database, Storage, and Real-time subscriptions. |
| **Intelligence**| Google Gemini Pro | Generative AI for mentoring, content enhancement, and roadmaps. |
| **Notifications**| Firebase (FCM) | Push notifications for engagement and transaction alerts. |
| **Animations** | Framer Motion | "Slick" UI transitions and micro-interactions. |

---

## 3️⃣ Deep Feature Analysis (The "2 Lakh" Scope)

### A. The Professional Suite
*   **Gig Marketplace** (`/gig-marketplace`): A freelance hub where users can post and apply for gigs.
    *   *Features*: Filtering by price/location, search, and direct application.
    *   *Data Source*: `gig_listings` table (Dynamic).
*   **Applications Dashboard** (`/applications`): Tracks status of gig/job applications.
*   **Tech Match** (`/tech-match`): Tinder-style matching for co-founders and collaborators.
*   **Founders Corner** (`/founders-corner`): Exclusive zone for startup founders (locked by role/verification).
*   **Project Ideas** (`/project-ideas`): Community-curated list of startup ideas to prevent "builder's block".

### B. The Social Engine
*   **Dynamic Feed**: Infinite scroll with caching, "Stories" (Instagram-style 24h posts), and "Reels" (PostDetails).
*   **Chat System**:
    *   **Direct**: Encrypted 1:1 messaging with typing indicators (`typing_indicators` table).
    *   **Group**: Topic-based group chats (`/messages/group/:groupId`).
    *   **Broadcasts**: Admin-triggered popups sent to all active users via WebSocket.
*   **Profile**: Rich identity with GitHub/LinkedIn sync, "Tech Stack" tags, and "Verification" badges.

### C. The Gaming Arcade (`/games`)
A fully integrated gaming platform to drive retention. Users earn **XP** and **Coins** by playing.
*   **Logic**: `src/pages/games/*`
*   **Titles**:
    *   *Strategy*: Dots & Boxes, Tic Tac Toe, Connect Four, Hexon (Pattern Pro).
    *   *Speed*: Reflex Master, Speed Math.
    *   *Puzzle*: Memory Match, Word Blitz, Number Merge (2048 style).
    *   *Coding*: Code Duel (1v1 coding battles).
*   **Rewards**: Winning triggers `useGameReward.ts` to execute `increment_score` RPC and update the `wallet`.

### D. Gamification & Economy
*   **Virtual Economy**: Users have a "Wallet" (`/wallet`) storing generic "Coins".
    *   *Transactions*: Deposit, Withdrawal, Game Wins, Daily Login Bonuses.
*   **Leveling System**: XP based progression.
    *   *Actions*: Posting (+XP), commenting (+XP), winning games (+XP).
*   **Leaderboards**:
    *   **Hall of Fame**: All-time top users.
    *   **Weekly Board**: Resets every 7 days.

### E. AI Suite
*   **AI Mentor**: Chat interface for coding help (Context-aware system prompt).
*   **AI Enhancer**: Rewrites post content to be more professional or viral.
*   **AI Roadmap**: Generates step-by-step learning paths for any technology.

---

## 4️⃣ The Admin Operating System (`/admin`)

Hidden from normal users, this is the command center of FutoraOne.
**Role Access**: Strictly `admin` role in `user_roles` table.

| Module | Purpose | Key Capabilities |
| :--- | :--- | :--- |
| **Dashboard** | Bird's-eye view | Real-time user count, active sessions, system health. |
| **Users** | User Management | Ban/Unban, Edit Roles, View full profile data. |
| **Finance** | Economy Control | Monitor wallet balances, high-value transaction alerts. |
| **Coins** | Currency Ops | Manually grant/deduct coins from users. |
| **Popups** | Broadcasting | Create and push "System Alerts" or "Marketing Popups" live. |
| **Moderation**| Content Safety | Review reported posts/comments (`reports` table). |
| **Database** | Raw Data | Direct simplified view of tables like `profiles`. |
| **Logs** | Audit Trails | View system logs (`admin_logs`). |

---

## 5️⃣ Comprehensive Route Map

### Public / Auth
- `/` (Welcome)
- `/auth` (Login/Signup)
- `/terms`, `/privacy`, `/about`

### Core App (Protected)
- `/feed` (Main Stream)
- `/explore` (Search & Discovery)
- `/notifications` (Activity Feed)
- `/messages` (Chat Hub)
- `/profile` (Self) & `/user/:id` (Others)

### Features
- `/gig-marketplace`, `/applications`
- `/projects`, `/project/:id`
- `/ai-tools`, `/ai-roadmap`, `/ai-enhancer`
- `/wallet` (Economy)
- `/ecosystem` (Platform Map)
- `/founders-corner`

### Gaming
- `/games` (Lobby)
- `/games/dots-and-boxes`, `/games/tic-tac-toe`, `/games/code-duel`... (10+ routes)
- `/leaderboard`, `/hall-of-fame`

### Admin (Role-Gated)
- `/admin` (Root)
- `/admin/users`, `/admin/finance`, `/admin/coins`
- `/admin/popups`, `/admin/feedback`, `/admin/database`
- `/admin/settings`, `/admin/logs`

---

## 6️⃣ Database Schema (The Truth)

The persistent memory of FutoraOne resides in PostgreSQL.

### Core Tables
- `profiles`: The user identity (mirrors `auth.users`).
- `posts`: Content feeds.
- `comments`, `likes`, `saves`: Engagement signals.
- `follows`: Social graph (Adjacency list).

### Economy & Marketplace
- `gig_listings`: (Dynamic) Stores available freelance gigs.
- `wallet`: Stores user balance `(user_id, balance, currency)`.
- `transactions`: Ledger of all coin movements `(id, amount, type, status)`.

### Gaming & Gamification
- `game_stats`: Application-wide game scores.
- `user_achievements`: Badges unlocked by users.
- `xp_logs`: History of XP gains.

### System & Admin
- `admin_logs`: Audit trail for admin actions.
- `broadcasts`: Active popup configurations.
- `app_feedback`: User submitted bug reports.
- `notifications`: Central notification store.
- `stories`: 24h ephemeral content media.

---

## 7️⃣ Critical Workflows

### 1. The "Game Win" Flow
1. User wins `TicTacToe`.
2. Frontend calls `useGameReward.ts`.
3. Client invokes `increment_score` RPC function.
4. Database Trigger updates `wallet` balance (+50 coins).
5. UI displays "Victory" animation and confirmed coin toast.

### 2. The "Broadcast" Flow
1. Admin creates popup in `/admin/popups`.
2. Row inserted into `broadcasts` table.
3. `BroadcastPopup.tsx` (on every client) receives `INSERT` event via Realtime.
4. Popup appears instantly overlays on all active users' screens.

### 3. The "Gig Application" Flow
1. User clicks "Apply" on `/gig-marketplace`.
2. Record inserted into `gig_applications`.
3. Notification triggered for the Gig Owner.
4. Applicant sees status in `/applications`.

---

## 8️⃣ Maintenance Guide

### Adding a New Game
1. Create page components in `src/pages/games/`.
2. Add route in `src/App.tsx`.
3. Register game key in `src/hooks/useGameDes.ts`.
4. Ensure `useGameReward` is called on win state.

### Scaling The Database
- **Index Recommendations**:
    - `gig_listings(skills_required)` for faster filtering.
    - `transactions(user_id, created_at)` for wallet history speed.
- **Cache Strategy**:
    - The `QueryClient` defaults to 1 hour GC. For real-time critical data (like Wallet), verify invalidation logic in `useWalletSync.ts`.

---

*Verified against codebase as of Feb 2026. This document represents the absolute source of truth.*
