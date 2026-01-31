# 📘 FutoraOne: Internal Documentation & Analysis

Welcome to the internal guide for the FutoraOne application. This document is designed to help you understand every part of your app—from how it looks to how it saves data—in simple, human language.

---

## 1️⃣ High-Level App Overview

### What is this app?
FutoraOne is a **social networking platform specifically for developers**. Think of it as a mix between Instagram (visual feed/stories), LinkedIn (professional profiles/projects), and a developer toolkit (AI roadmaps/tools).

### Main Features
- **Dynamic Feed**: Posts with images/videos, comments, and reactions.
- **Developer Profiles**: Custom banners, tech skills, XP/Level system, and verification badges (blue checkmarks).
- **Project Showcase**: A place to show off your builds and get feedback.
- **Real-time Chat**: Personal and group messaging.
- **AI Suite**: AI Mentor, AI Roadmap generator, and Content Enhancers.
- **Engagement**: Games, Leaderboards, and Daily Challenges.

### User Flow
1. **Welcome/Auth**: User lands on a beautiful welcome page and signs up/logs in.
2. **Dashboard (Feed)**: The central hub to see what others are building.
3. **Exploration**: Search for users, projects, or categories.
4. **Interaction**: Chat with peers, play games, or use AI tools to improve skills.
5. **Growth**: Earn XP by engaging, level up, and apply for verification.

### Overall Architecture
The app follows a modern **Serverless Architecture**:
- **Frontend**: React + Vite (The "Body" - what the user sees).
- **Backend/Database**: Supabase (The "Brain & Memory" - manages users, data, and logic).
- **AI Services**: Google Gemini (The "Intelligence" - powers the AI features).

---

## 2️⃣ Frontend Explanation (The "Body")

### Framework: React + Vite
- **React**: A library for building user interfaces using "Components" (reusable blocks of code).
- **Vite**: A modern build tool that makes development **extremely fast**. It "serves" your code instantly during development and "packages" it efficiently for production.

### Folder Structure Explained (`/src`)
- `components/`: Small, reusable UI pieces (Buttons, Cards, Modals).
- `pages/`: The main "screens" of your app (Feed, Profile, Chat).
- `hooks/`: Custom logic that can be reused across components (e.g., fetching feed data).
- `services/`: Specialized code to talk to external things (like Firebase Notifications).
- `assets/`: Static files like images, icons, and global styles.
- `lib/`: Helper tools (like the Supabase client connection).

### Routing (Navigation)
The app uses `react-router-dom` (found in `App.tsx`). It works like a GPS: when you click a link like `/profile`, it tells the app exactly which "Page" component to show on the screen without reloading the whole browser.

### State Management
- **React Query**: Used to manage data from the database. It handles loading states, caching (remembering data so it doesn't have to fetch again), and background updates.
- **Context API**: Used for global info, like whether a user is online (`UserPresenceContext`).

---

## 3️⃣ Backend Explanation (The "Brain")

### How it's structured: Supabase
The app doesn't have a traditional "Backend Server" (like Express or Python). Instead, it uses **Supabase**, which provides everything as a service:
1. **Authentication**: Manages signups, logins, and passwords securely.
2. **PostgREST**: Automatically turns your database tables into an API.
3. **Edge Functions**: Small snippets of code that run in the cloud for specific tasks (like talking to AI).

### API Flow
1. **Request**: The Frontend asks: "Give me the latest posts."
2. **Processing**: Supabase checks if the user is allowed to see them (using RLS policies).
3. **Response**: Supabase sends the data back as JSON (a simple text format).

---

## 4️⃣ API Documentation

Since we use Supabase, most APIs are automatic. However, here are the key "Custom" endpoints (Edge Functions):

| Endpoint | Method | Purpose | Who uses it? |
| :--- | :--- | :--- | :--- |
| `ai-mentor` | POST | Answers tech questions using Gemini AI | AI Mentor Chat |
| `manage-verification` | POST | Handles badge applications | Admin/User Profile |
| `send-fcm-notification` | POST | Sends push notifications to phones | System/Messaging |

---

## 5️⃣ Database Explanation (The "Memory")

### Database: PostgreSQL
A powerful, reliable database that stores everything in organized tables.

### Key Tables
- **profiles**: Stores user info (names, bio, XP, level, avatar).
- **posts**: The actual content users share (text, images, video links).
- **messages**: Chat history between users.
- **projects**: Detailed showcases of developer work.
- **follows**: Who is following whom.
- **game_stats**: Scores and wins for the built-in games.

### Row Level Security (RLS) 🛡️
This is the "Security Guard" of your data. It ensures that:
- You can only edit **your own** profile.
- You can only read messages in chats **you are part of**.
- Public posts are viewable by **everyone**.

### Database Logic (Functions & Triggers)
- **Triggers**: Automated actions. For example, when a user signs up, a trigger automatically creates a entry in the `profiles` table.
- **Functions**: Custom SQL code that calculates things like "Who is the top user on the leaderboard?"

### Migrations
Migrations are like "Save Points" for your database structure. They are SQL files in `supabase/migrations` that track every change made to the tables over time.

---

## 6️⃣ File-by-File Config Explanation

- **`package.json`**: The "Shopping List" of the project. It lists every library the app needs to run.
- **`vite.config.ts`**: The "Instruction Manual" for Vite. It tells Vite how to build the app and which plugins to use.
- **`tsconfig.json`**: The "Rules" for TypeScript. It ensures the code is written correctly and helps catch bugs early.
- **`.env`**: The "Vault". It stores secret keys (like Supabase URLs) that shouldn't be shared publicly.
- **`eslint.config.js`**: The "Code Police". It checks your code for messy bits or common mistakes.

---

## 7️⃣ Technologies & Languages Used

- **TypeScript**: A "Supercharged" version of JavaScript. It adds "types" (like saying a variable must be a number), which prevents 90% of common coding errors.
- **Tailwind CSS**: A styling tool that lets us design the app directly in the code using simple classes (like `bg-blue-500` for a blue background).
- **Shadcn/UI**: A collection of beautiful, pre-made components (buttons, input boxes) that give the app its premium feel.
- **Framer Motion**: The "Animator". It powers the smooth transitions and pop-up effects.

---

## 8️⃣ Build, Run & Deploy Flow

### Local Development
When you run `npm run dev`:
1. Vite starts a local web server (usually at `localhost:8080`).
2. It watches your files. The moment you save a change, the browser updates instantly!

### Production Build
When you run `npm run build`:
1. Vite shrinks and "minifies" your code (makes it tiny and fast).
2. It creates a `dist` folder.
3. This folder is then uploaded to a hosting provider (like Vercel or Netlify) to make the app live for everyone.

---

## 9️⃣ Dependency & Risk Analysis

### ⚠️ Critical Files (Be Careful!)
- **`src/lib/supabase.ts`**: If this breaks, the app loses its connection to the database.
- **`src/App.tsx`**: The main entry point. A small mistake here can break every single page.
- **`supabase/migrations/`**: Changing old migrations can corrupt your database structure. Always create **new** migrations instead of editing old ones.

### ✅ Safe to Edit
- **`src/components/`**: Feel free to tweak the look of buttons or cards.
- **`src/pages/`**: Adding new text or images to pages is generally safe.

### Common Mistakes to Avoid
1. **Leaking Keys**: Never put your secret keys directly in the code; always use the `.env` file.
2. **RLS Errors**: If data isn't showing up, 99% of the time it's because an RLS policy is blocking it.

---

## 🎯 Summary
FutoraOne is a high-performance, modern application built with the best tools available today. It’s designed to be fast, secure, and easy to scale. By following this guide, you now have the foundation to navigate the codebase with confidence!

<br />

# FutoraOne Deep Technical Documentation

This document provides a low-level, technical overview of the FutoraOne application to facilitate safe debugging, full control, and zero-loss maintenance.

## 1️⃣ EXACT DATA FLOW

### Feed & Posts
**Flow:** `Feed.tsx` → `FeedPost.tsx` → `useFeedLogic.ts` → Supabase SDK → `public.posts` → RLS policies → JSON Response
- **Hook:** `useFeedLogic.ts` (Handles pagination, likes, saves, and real-time updates)
- **Tables:** `posts`, `profiles`, `likes`, `comments`, `saves`, `post_reactions`
- **Edge Functions:** None (Direct DB via SDK)
- **RLS Policy:** 
  - `posts`: `SELECT` (Authenticated), `INSERT/UPDATE/DELETE` (Owner)
  - `likes`: `SELECT` (Public), `INSERT/DELETE` (Auth user)
- **What breaks:** Feed disappears or fails to update; social interactions (like/save) fail.

### Authentication
**Flow:** `Welcome.tsx` → `Auth.tsx` → Supabase Auth → `auth.users` → DB Trigger → `public.profiles`
- **Hook:** None (Direct Supabase Auth SDK)
- **Tables:** `auth.users` (Internal), `public.profiles` (Mirrored)
- **What breaks:** Users cannot log in; profile data becomes desynced from Auth metadata.

### Profile
**Flow:** `Profile.tsx` → Supabase SDK → `public.profiles` → RLS Policy → Profile State
- **Hook:** Inline `useEffect` + `refreshProfile` callback
- **Tables:** `profiles`, `projects`, `follows`, `user_achievements`
- **RLS Policy:** `profiles` (Select: All, Update: Owner-only)
- **What breaks:** Users see blank profiles; bio/avatar updates fail.

### Chat & Messaging
**Flow:** `Messages.tsx` → `Chat.tsx` → Supabase Channel → `public.messages` → RLS → UI Update
- **Hook:** `useTypingIndicator.ts`, `useUnreadMessages.tsx`
- **Tables:** `conversations`, `conversation_participants`, `messages`, `tech_matches`
- **RLS Policy:** Access limited to users where `auth.uid() = user_id` in `conversation_participants`.
- **What breaks:** Messages fail to send; real-time updates stop; unauthorized access to private chats.

### AI Tools (Mentor, Companion, Enhancer)
**Flow:** `AIPage.tsx` / `useAIMentor.ts` → Supabase Edge Function (`ai-mentor`) → Google Gemini API → Response
- **Hook:** `useAIMentor.ts`
- **Edge Function:** `ai-mentor` (Handles system prompts for various modes)
- **Rate Limits:** Handled via Gemini API quotas.
- **What breaks:** "AI Service Error" appears; chatbots stop responding.

---

## 2️⃣ AUTHENTICATION LIFECYCLE

### 🟢 Signup
1. `Auth.tsx` calls `supabase.auth.signUp`.
2. Supabase Auth creates entry in `auth.users`.
3. **Database Trigger:** `on_auth_user_created` fires `public.handle_new_user()`.
4. **Table Touch:** `public.profiles` receives a new row with `id` from `auth.users`.
5. **Persistence:** Auth session is stored in `localStorage` by the SDK.

### 🟡 Session & Protection
- **Persistence:** `App.tsx` and `Auth.tsx` use `supabase.auth.onAuthStateChange` to listen for session events.
- **Protected Routes:** Enforced via component-level checks (e.g., `useEffect` with `navigate("/auth")` in `Feed.tsx`, `Profile.tsx`).
- **Refresh:** On page load, `supabase.auth.getSession()` restores the user from `localStorage`.

### 🔴 Logout
- `supabase.auth.signOut()` clear the `localStorage` session and triggers `onAuthStateChange`.
- UI redirects to `/` or `/auth`.

---

## 3️⃣ FILE USAGE MAP

| Path | Status | Use / Dependencies | Criticality |
| :--- | :--- | :--- | :--- |
| `src/hooks/useFeedLogic.ts` | **YES** | Core logic for the main feed | 🔴 Critical |
| `src/contexts/UserPresenceContext.tsx` | **YES** | Real-time presence tracking | 🟡 Conditional |
| `src/integrations/supabase/types.ts` | **YES** | Generated database types | 🔴 Critical |
| `public/OneSignalSDKWorker.js` | **NO** | Legacy. Replaced by Firebase/FCM | 🟢 Safe |
| `supabase/migrations/*.sql` | **YES** | Database schema and RLS | 🔴 Critical |
| `public/firebase-messaging-sw.js` | **YES** | Service worker for FCM notifications | 🔴 Critical |

---

## 4️⃣ ENVIRONMENT VARIABLES & SECRETS

| Variable | Public/Private | Component Access | Impact of Change |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **Public** | `client.ts` | Site breaks (no database connection) |
| `VITE_SUPABASE_ANON_KEY`| **Public** | `client.ts` | Permission denied errors |
| `GEMINI_API_KEY` | **Private** | `ai-mentor` (EF) | AI tools fail to respond |
| `FIREBASE_SERVER_KEY` | **Private** | `send-fcm-notification` (EF)| Push notifications fail |
| `SUPABASE_SERVICE_ROLE_KEY`| **Private** | Admin Scripts | DANGEROUS: Bypasses RLS |

---

## 5️⃣ EDGE FUNCTIONS & API CONTRACTS

### `ai-mentor`
- **Caller:** `useAIMentor.ts`
- **Payload:** `{ messages: Message[], mode: string }`
- **Response:** `{ generatedText: string }`
- **Security:** Requires `anon` key or JWT for access.

### `send-fcm-notification`
- **Caller:** Post/Comment hooks or UI
- **Payload:** `{ tokens: string[], title: string, body: string, data?: object }`
- **Security:** Requires Service Role key on server; internal use only.

---

## 6️⃣ REAL-TIME & SUBSCRIPTIONS

1. **Tables using Realtime:** `messages`, `conversations`, `notifications`, `likes`, `comments`.
2. **Lifecycle:** Channels are opened in `useEffect` and cleaned up using `supabase.removeChannel(channel)`.
3. **Risks:** 
   - **Memory Leaks:** Forgetting to remove channels on component unmount (partially handled in `Chat.tsx`).
   - **Disconnects:** Handled by Supabase SDK auto-reconnect.
4. **Broadcast:** Presence and Typing indicators use `broadcast` events, which are non-persistent.

---

## 7️⃣ ERROR HANDLING & DEBUGGING

- **Frontend:** Handled by `GlobalErrorBoundary.tsx` (catches crashes) and `use-toast` (notifies user).
- **Supabase:** Errors returned in `{ data, error }` objects.
- **Failures:** 
  - `ChunkLoadError`: Caught by Error Boundary, triggers auto-refresh.
  - `RLS Violation`: Appears in Console as `403 Forbidden`.
- **Debugging:**
  1. Check `import.meta.env` values in Network tab.
  2. Inspect Supabase Edge Function logs in the Supabase Dashboard.

---

## 8️⃣ PERFORMANCE & COST RISK

- **Slowdown:** `Profile.tsx` fetches all data (posts, projects, follows) in parallel; as datasets grow, this will increase load time.
- **Reads:** Real-time subscriptions for message lists trigger many re-fetches.
- **Caching:** Global `queryClient` (React Query) handles persistence with a 1-hour GC time.

---

## 9️⃣ SAFE CLEANUP PREVIEW

- **Unused Assets:** `public/OneSignalSDKWorker.js`, `public/OneSignalSDKWorker.js.map`.
- **Redundant Env:** Any reference to `VITE_ONESIGNAL_APP_ID` in older `.env.example` files.
- **Legacy Components:** None identified; the current component tree in `src/components/chat` is actively used by `Messages.tsx` and `Chat.tsx`.

<br />

# FutoraOne: Advanced Technical Insights

This document summarizes the final 5% of advanced, non-breaking architectural knowledge for FutoraOne. These insights are for awareness and safe maintenance.

## 1️⃣ TESTING STATUS

- **Current Coverage**: **No tests present in codebase.**
- **Verification**: No `tests/` directory found; no files matching `*.test.ts` or `*.spec.ts` exist in the repository.
- **Normal Locations**: In a standard React/Vite project, unit tests would reside in `src/__tests__/` and E2E tests in a root `e2e/` folder using Playwright or Cypress.
- **Risk**: Without automated tests, any modification to core logic (like `useFeedLogic.ts` or RLS triggers) requires manual regression testing across the entire app to prevent breaking existing features.

---

## 2️⃣ CI / CD & DEPLOYMENT AUTOMATION

- **Status**: **No CI/CD configured.**
- **Verification**: No `.github/workflows` folder or third-party CI config files (e.g., `vercel.json`, `netlify.toml`) are present in the root.
- **Triggers**: Deployment is currently a **manual process**.
- **Process**: On push to the `main` branch, no automated build or deployment is triggered from within this repository. Deployment likely occurs via manual terminal commands (e.g., `npm run build` followed by a manual upload of `dist/`).

---

## 3️⃣ INFRASTRUCTURE & SERVICE BOUNDARIES

The application operates across four distinct service boundaries:

| Service | Responsibility | Management |
| :--- | :--- | :--- |
| **Supabase** | Database, Auth, Storage, Edge Functions, RLS | **Fully Managed** |
| **Google Gemini**| Generative AI and content enhancement logic | **Managed API** |
| **Firebase** | PWA Cloud Messaging (FCM) and Notifications | **Managed API** |
| **Frontend** | Routing, State, UI, and client-side validation | **Project Code** |

**Single Points of Failure:**
- **Supabase Connectivity**: If the Supabase project is paused or keys are rotated incorrectly, the entire app (Auth + Data) goes offline.
- **Gemini API Key**: If the key is revoked or quota-limited, all AI features (Mentor, Roadmap, Enhancer) stop working immediately.

---

## 4️⃣ SCALING & COST AWARENESS

Based on the current architecture, resource usage scales as follows:

| Feature | Resource Impact | Cost Risk |
| :--- | :--- | :--- |
| **Feed & Reels** | High Database Reads (Media heavy) | **Medium** |
| **AI Tools** | Edge Function Invocations & Gemini API Hits | **High** |
| **Global Chat** | Realtime Channel connections & Broadcasts | **Medium** |
| **Leaderboards** | CPU-intensive aggregate queries | **Low** |

**Scaling Risks:**
- **Realtime Load**: As concurrent users increase, the proximity/broadcast usage in `UserPresenceContext` will consume more Supabase Realtime slots.
- **Media Costs**: Heavy video usage in `TechReels` will increase Supabase Storage bandwidth consumption.

---

## 5️⃣ DATA BACKUP & RECOVERY STATUS

- **Automated Backups**: Depends on Supabase project tier (usually daily automated backups for Pro tier, none for Free tier by default).
- **Manual Backups**: No dedicated backup scripts found in `scripts/`. `setup-db.js` is for initialization, not recovery.
- **Recovery Limitations**: Recovery is limited to the latest database snapshot provided by Supabase. Point-in-time recovery depends on specific Supabase settings.

---

## 6️⃣ SECURITY POSTURE

- **RLS Coverage**: RLS is **enforced** on all core tables (profiles, posts, messages).
- **Public Access**: Tables like `profiles` have public `SELECT` access, but `UPDATE` is strictly locked to the authenticated owner.
- **Secret Hygiene**: No `SERVICE_ROLE_KEY` is exposed in the `src/` directory. All admin-privileged actions are siloed in the `scripts/` folder or handled inside Edge Functions.
- **Frontend Reliance**: Some navigation logic (admin dashboard access) relies on frontend context (`useIsAdmin.tsx`), but the underlying API is secured by database-level policies.

---

## 7️⃣ OWNERSHIP & MAINTENANCE

- **Manual Monitoring**: Supabase Edge Function logs and Gemini API usage must be monitored manually via their respective dashboards.
- **Managed Lifecycle**: Supabase automatically handles database patching, scaling (if enabled), and security at the infrastructure level.
- **Technical Debt**: The absence of a test suite is the primary maintenance risk as the project grows or new developers join the team.
