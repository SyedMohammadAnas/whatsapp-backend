-- WhatsApp Sessions Table Migration
-- Run this SQL in your Supabase SQL Editor to create the sessions table

-- Create the whatsapp_sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT UNIQUE NOT NULL,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_client_id ON whatsapp_sessions(client_id);

-- Create index on is_active for filtering active sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_active ON whatsapp_sessions(is_active);

-- Create index on updated_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON whatsapp_sessions(updated_at);

-- Add RLS (Row Level Security) policy for service role access
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role full access" ON whatsapp_sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON whatsapp_sessions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comment to table
COMMENT ON TABLE whatsapp_sessions IS 'Stores WhatsApp Web.js session data for persistence across deployments';

-- Add comments to columns
COMMENT ON COLUMN whatsapp_sessions.id IS 'Unique identifier for the session record';
COMMENT ON COLUMN whatsapp_sessions.client_id IS 'Unique identifier for the WhatsApp client';
COMMENT ON COLUMN whatsapp_sessions.session_data IS 'Serialized WhatsApp session data in JSON format';
COMMENT ON COLUMN whatsapp_sessions.created_at IS 'Timestamp when the session was first created';
COMMENT ON COLUMN whatsapp_sessions.updated_at IS 'Timestamp when the session was last updated';
COMMENT ON COLUMN whatsapp_sessions.is_active IS 'Boolean flag indicating if the session is currently active';
