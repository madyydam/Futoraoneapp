-- Dynamic Room Intelligence v4 Migration

-- 1. Create room_categories table
CREATE TABLE IF NOT EXISTS public.room_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Sparkles',
    color TEXT DEFAULT 'purple',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conversation_id, name)
);

-- 2. Relax the message_type constraint on messages table
-- First, drop the old constraint if it exists (names might vary, but usually it's messages_message_type_check)
DO $$ 
BEGIN
    ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
END $$;

-- 3. Seed default categories for all existing conversations
-- This ensures the UI doesn't look empty and maintains backward compatibility
INSERT INTO public.room_categories (conversation_id, name, icon, color, position)
SELECT id, 'Ideas', 'Lightbulb', 'yellow', 0 FROM public.conversations
ON CONFLICT (conversation_id, name) DO NOTHING;

INSERT INTO public.room_categories (conversation_id, name, icon, color, position)
SELECT id, 'Decisions', 'CheckCircle2', 'green', 1 FROM public.conversations
ON CONFLICT (conversation_id, name) DO NOTHING;

INSERT INTO public.room_categories (conversation_id, name, icon, color, position)
SELECT id, 'Next Moves', 'Rocket', 'purple', 2 FROM public.conversations
ON CONFLICT (conversation_id, name) DO NOTHING;

-- 4. Enable Realtime for room_categories
ALTER PUBLICATION supabase_realtime ADD TABLE room_categories;

-- 5. Set up RLS (assuming public access for now as per project style, 
-- but normally you'd restrict to conversation participants)
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to room_categories"
ON public.room_categories FOR ALL
TO public
USING (true)
WITH CHECK (true);
