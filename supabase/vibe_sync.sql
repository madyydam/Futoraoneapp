-- Add Vibe identity columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vibe_mood TEXT DEFAULT '😎';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vibe_status TEXT;

-- Add shared visual customization to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS wallpaper_config JSONB DEFAULT '{"type": "transparent"}'::jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bubble_config JSONB DEFAULT '{}'::jsonb;

-- Note: If you get "already member of publication" error, these lines are already done:
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
