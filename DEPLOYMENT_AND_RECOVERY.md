# FutoraOne Production Deployment, Backups & Recovery Runbook

## 1. Pre-Deployment Checklist

1. **Apply Database Schema (`supabase/database/`)**
   Run the modular database files in the exact dependency order defined in `supabase/database/master.sql`:
   1. `supabase/database/01_core.sql`
   2. `supabase/database/04_groups.sql`
   3. `supabase/database/05_communities.sql`
   4. `supabase/database/03_messages_chat.sql`
   5. `supabase/database/02_social.sql`
   6. `supabase/database/06_economy_wallet.sql`
   7. `supabase/database/07_gamification.sql`
   8. `supabase/database/08_storage.sql`
   9. `supabase/database/09_admin_performance.sql`
   ```bash
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/database/master.sql
   ```
   *(If you use the Supabase SQL Editor, paste each file in that exact order.)*
   Verify triggers (`on_auth_user_created`, `trg_guard_profile_privileged_columns`, `trg_guard_message_updates`, `trigger_notify_on_profile_view`), RLS policies, and revoked internal function grants are active.

2. **Regenerate TypeScript Database Types**
   ```bash
   supabase gen types typescript --linked > src/integrations/supabase/types.ts
   ```

3. **Set Required Edge Function Secrets**
   ```bash
   supabase secrets set \
     SUPABASE_URL="https://sbzsgeokspmkewrmuqgi.supabase.co" \
     SUPABASE_ANON_KEY="<anon-key>" \
     SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
     GEMINI_API_KEY="<gemini-key>" \
     FIREBASE_SERVICE_ACCOUNT_JSON='<service-account-json>'
   ```

4. **Deploy Edge Functions with JWT Verification Enabled**
   ```bash
   supabase functions deploy ai-mentor moderate-content send-fcm-notification manage-verification
   ```

5. **Bootstrap First Admin Role (SQL Editor / Migration)**
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('<admin-user-uuid>', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

---

## 2. Database Backups & Recovery (PITR)

- **Supabase Managed Backups**: Enable daily automated snapshots + Point-in-Time Recovery (PITR) on project `sbzsgeokspmkewrmuqgi` for financial integrity of `native_wallets` and `native_transactions`.
- **On-Demand Logical Snapshot**:
  ```bash
  pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --file="futoraone_backup_$(date +%Y%m%d_%H%M%S).dump"
  ```
- **Rollback / Recovery Procedure**:
  1. Toggle maintenance mode on by updating `app_config` (`key = 'maintenance_mode'`, `value = '{"enabled": true}'`) so active clients pause mutations cleanly via `AppLifecycleManager`.
  2. Restore target point-in-time snapshot from Supabase Dashboard or `pg_restore`.
  3. Verify `native_wallets` ledger invariants (`SUM(amount)` in `native_transactions` reconciles with `native_wallets.balance`).
  4. Disable `maintenance_mode` and inspect `admin_logs`.

---

## 3. Incident Response & Session Revocation

- **Account Compromise / Abuse**:
  - Ban user via Admin Dashboard (`/admin/users`) -> sets `profiles.is_banned = true` and writes `BAN_USER` to `admin_logs`.
  - Active sessions are signed out on focus/auth refresh via `AuthContext`, and RLS + Edge Function guards reject banned users server-side immediately.
- **Secret Rotation**:
  - Rotate compromised `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or Supabase service-role key via `supabase secrets set` and redeploy functions.
