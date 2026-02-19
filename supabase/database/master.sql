/*
================================================================================
FUTORAONE — MASTER DATABASE SETUP (A–Z Complete Backup)
================================================================================
Run this file in ONE SHOT in the Supabase SQL Editor to rebuild the ENTIRE
database from scratch. All statements are idempotent (IF NOT EXISTS / OR REPLACE
/ ON CONFLICT DO NOTHING), so it is safe to re-run on an existing database.

RUN ORDER:
  01_core.sql              → Extensions, profiles, follows, user_presence
  02_social.sql            → Posts, reels, stories, likes, comments, notifications
  03_messages_chat.sql     → Conversations, messages (DM+group+community), RLS helpers
  04_groups.sql            → Groups, group_members
  05_communities.sql       → Communities, channels, members
  06_economy_wallet.sql    → Coins, native wallet, gigs, founders, reviews
  07_gamification.sql      → XP, levels, achievements, streaks
  08_storage.sql           → Storage buckets & policies
  09_admin_performance.sql → Indexes, admin policies
================================================================================
*/

-- =============================================================================
-- 01: CORE
-- =============================================================================
\i 01_core.sql

-- =============================================================================
-- 04: GROUPS (referenced by messages in 03)
-- =============================================================================
\i 04_groups.sql

-- =============================================================================
-- 05: COMMUNITIES (referenced by messages in 03)
-- =============================================================================
\i 05_communities.sql

-- =============================================================================
-- 03: MESSAGES & CHAT (depends on groups + communities existing)
-- =============================================================================
\i 03_messages_chat.sql

-- =============================================================================
-- 02: SOCIAL
-- =============================================================================
\i 02_social.sql

-- =============================================================================
-- 06: ECONOMY & WALLET
-- =============================================================================
\i 06_economy_wallet.sql

-- =============================================================================
-- 07: GAMIFICATION
-- =============================================================================
\i 07_gamification.sql

-- =============================================================================
-- 08: STORAGE
-- =============================================================================
\i 08_storage.sql

-- =============================================================================
-- 09: ADMIN & PERFORMANCE
-- =============================================================================
\i 09_admin_performance.sql

/*
================================================================================
SETUP COMPLETE — FutoraOne Database v1.0
https://github.com/Madyydam/Futoraoneapp
================================================================================
*/
