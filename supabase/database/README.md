# FutoraOne — Database Structure

All SQL files live in `supabase/database/`. Run them in the Supabase SQL Editor in the order shown below.

## File Order & Purpose

| File | Section | Tables / Key Content |
|------|---------|----------------------|
| `01_core.sql` | Core | `profiles`, `follows`, `blocks`, `user_presence`. Extensions, types, `handle_new_user` trigger. |
| `04_groups.sql` | Groups | `groups`, `group_members`. Must run before messages. |
| `05_communities.sql` | Communities | `communities`, `community_channels`, `community_members`. Must run before messages. |
| `03_messages_chat.sql` | Chat | `conversations`, `conversation_participants`, `messages`. RLS helpers (SECURITY DEFINER). |
| `02_social.sql` | Social | `posts`, `likes`, `comments`, `reels`, `stories`, `post_reactions`, `saves`, `notifications`, `reports`. |
| `06_economy_wallet.sql` | Economy | `user_wallet`, `coin_transactions`, `native_wallets`, `gig_listings`, `founder_listings`, `reviews`. |
| `07_gamification.sql` | XP / Levels | `achievements`, `user_achievements`. XP, levels, streaks, achievement triggers. |
| `08_storage.sql` | Storage | Buckets: `avatars`, `post-images`, `group-avatars`, `community-avatars`. All storage RLS. |
| `09_admin_performance.sql` | Admin | Performance indexes, admin moderation policies, verification_requests, waitlist RLS. |

## Dependency Order (important!)

```
01_core → 04_groups → 05_communities → 03_messages_chat → 02_social → 06_economy_wallet → 07_gamification → 08_storage → 09_admin_performance
```

> Groups and Communities must be created **before** messages, because the `messages` table has FK references to `groups.id` and `community_channels.id`.

## Recent Migration History (already applied to Supabase)

These one-off fixes were applied during development and are now embedded in the section files above:

| Migration File | Applied | Description |
|---|---|---|
| `20260218_fix_messages_nullable.sql` | ✅ | Drop NOT NULL on `conversation_id`; user_presence + conversation RLS |
| `20260218_fix_rls_recursion.sql` | ✅ | SECURITY DEFINER helpers to prevent group/community RLS recursion |
| `20260218_fix_unread_count.sql` | ✅ | Allow marking messages as read (unread badge fix) |
| `20260219_add_group_verified.sql` | ✅ | `is_verified` column on `groups` table |

## Full Fresh Setup

To rebuild from scratch, run each section file in the dependency order above, or use `master.sql` as a reference guide.
