-- Add message_type to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'idea', 'decision', 'action'));

-- Add room name to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name TEXT;

-- Index for summary aggregation performance
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(conversation_id, message_type);
