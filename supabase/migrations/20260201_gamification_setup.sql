-- Migration to setup Gamification System
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_challenges JSONB DEFAULT '[
    {"id": "story", "title": "Share a Story", "xp": 50, "completed": false, "current": 0, "target": 1},
    {"id": "likes", "title": "Like 5 Posts", "xp": 25, "completed": false, "current": 0, "target": 5},
    {"id": "comment", "title": "Leave a Comment", "xp": 30, "completed": false, "current": 0, "target": 1}
]'::jsonb;

-- 2. Create function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_active TIMESTAMPTZ;
    current_s INTEGER;
    longest_s INTEGER;
BEGIN
    SELECT last_activity_date, current_streak, longest_streak 
    INTO last_active, current_s, longest_s 
    FROM public.profiles 
    WHERE id = user_id;

    -- If last active was yesterday (within 48 hours but different day), increment streak
    IF last_active < CURRENT_DATE AND last_active >= CURRENT_DATE - INTERVAL '1 day' THEN
        current_s := current_s + 1;
    -- If last active was older than specifically yesterday, reset streak
    ELSIF last_active < CURRENT_DATE - INTERVAL '1 day' THEN
        current_s := 1;
    END IF;

    -- Update longest streak
    IF current_s > longest_s THEN
        longest_s := current_s;
    END IF;

    UPDATE public.profiles 
    SET 
        current_streak = current_s,
        longest_streak = longest_s,
        last_activity_date = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to add XP
CREATE OR REPLACE FUNCTION add_xp(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
DECLARE
    current_xp INTEGER;
    current_level INTEGER;
    new_xp INTEGER;
    new_level INTEGER;
BEGIN
    SELECT xp, level INTO current_xp, current_level FROM public.profiles WHERE id = user_id;
    
    new_xp := current_xp + amount;
    -- Simple level formula: Level = sqrt(XP / 100) or similar. Let's use 100 * level^2
    -- Inverted: Level = floor(sqrt(new_xp / 100)) + 1
    new_level := ALL(FLOOR(SQRT(new_xp / 100)) + 1);

    IF new_level < 1 THEN new_level := 1; END IF;

    UPDATE public.profiles 
    SET xp = new_xp, level = new_level
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
