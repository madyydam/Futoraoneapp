-- Broadcast Messages Table
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'announcement', -- info, announcement, feature_launch
    audience TEXT DEFAULT 'all', -- all, new_users, existing_users
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User Popup Status Table (Tracks if a user has seen a popup)
CREATE TABLE IF NOT EXISTS public.user_popup_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Linked to profiles for easy joining
    popup_id UUID REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
    seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, popup_id)
);

-- Enable RLS
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_popup_status ENABLE ROW LEVEL SECURITY;

-- Optional: Add role column to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- Policies for broadcast_messages
-- Admins can do everything
CREATE POLICY "Admins can manage broadcasts" ON public.broadcast_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (
                role = 'admin' OR 
                verification_category = 'admin' OR
                username IN ('sanu', 'admin_futora', 'madhu_dev')
            )
        )
    );

-- Users can read active broadcasts
CREATE POLICY "Authenticated users can read active broadcasts" ON public.broadcast_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' AND is_active = true
    );

-- Policies for user_popup_status
-- Users can manage their own seen status
CREATE POLICY "Users can manage their own seen status" ON public.user_popup_status
    FOR ALL USING (auth.uid() = user_id);

-- Admins can read all seen status
CREATE POLICY "Admins can view all seen status" ON public.user_popup_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (
                role = 'admin' OR 
                role = 'founder' OR
                verification_category = 'admin'
            )
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_active ON public.broadcast_messages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_popup_status_user_popup ON public.user_popup_status(user_id, popup_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON public.broadcast_messages(created_at);
