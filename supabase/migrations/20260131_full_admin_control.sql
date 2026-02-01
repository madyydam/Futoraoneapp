-- FULL ADMIN CONTROL INFRASTRUCTURE
-- This migration adds tables for global app settings and content reporting.

-- 1. APP CONFIGURATION TABLE
-- Stores global feature flags, maintenance mode status, etc.
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Seed initial config
INSERT INTO public.app_config (key, value) VALUES
('maintenance_mode', 'false'::jsonb),
('public_registration', 'true'::jsonb),
('force_2fa_admins', 'true'::jsonb),
('site_name', '"FutoraOne"'::jsonb),
('support_email', '"support@futoraone.com"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. CONTENT REPORTING SYSTEM
-- Allows users to report bad content, and admins to act on it.
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- ID of the post, project, or user being reported
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'project', 'user', 'comment')),
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    action_taken TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACTIVITY LOGS
-- Track admin actions for audit purposes.
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Admins can update app_config" ON public.app_config FOR ALL USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage reports" ON public.reports FOR ALL USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can see logs" ON public.admin_logs FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
