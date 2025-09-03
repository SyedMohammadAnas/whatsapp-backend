# WhatsApp Session Storage Setup Guide

This guide explains how to set up WhatsApp session storage using Supabase for production deployments while maintaining local storage for development.

## Overview

The WhatsApp backend now supports two session storage modes:
- **Local Storage** (Development): Sessions stored in local files
- **Supabase Storage** (Production): Sessions stored in Supabase database

## Setup Steps

### 1. Install Dependencies

```bash
cd whatsapp-backend
npm install
```

### 2. Create Supabase Table

Run the SQL migration in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-migration.sql`
4. Execute the SQL

### 3. Environment Configuration

#### Development (.env)
```env
NODE_ENV=development
CLIENT_ID=rafi-scheme-manager
SESSION_PATH=./whatsapp-session
```

#### Production (Render/Railway)
```env
NODE_ENV=production
CLIENT_ID=rafi-scheme-manager
SESSION_PATH=./whatsapp-session
SUPABASE_URL=https://gjjvqtkrbxdnrgoyyttv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## How It Works

### Development Mode
- Uses local file storage (`./whatsapp-session/`)
- Sessions persist between local restarts
- No external dependencies

### Production Mode
- Automatically uses Supabase storage
- Sessions persist across deployment restarts
- Fallback to local storage if Supabase fails

## API Endpoints

### Session Management (Production Only)
- `GET /api/whatsapp/sessions` - List all active sessions
- `POST /api/whatsapp/cleanup-old-sessions` - Clean up old sessions

### General Endpoints
- `GET /api/whatsapp/status` - Get connection status
- `GET /api/whatsapp/qr` - Get QR code for authentication
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/whatsapp/session-info` - Get detailed session info
- `POST /api/whatsapp/reconnect` - Force reconnection
- `POST /api/whatsapp/cleanup-sessions` - Clean up local sessions

## Session Persistence

### Local Development
- Sessions stored in `./whatsapp-session/` directory
- Files named `{client_id}.json`
- Automatic cleanup of old/corrupted files

### Production Deployment
- Sessions stored in Supabase `whatsapp_sessions` table
- Automatic session retrieval on startup
- Session updates during runtime
- Cleanup of old inactive sessions

## Troubleshooting

### Supabase Connection Issues
If Supabase connection fails, the system automatically falls back to local storage.

### Session Not Persisting
1. Check Supabase table exists
2. Verify environment variables
3. Check service role key permissions

### Local Development Issues
1. Ensure `SESSION_PATH` directory exists
2. Check file permissions
3. Verify `NODE_ENV=development`

## Migration

### Local to Supabase
```javascript
// The system automatically handles migration
// No manual steps required
```

### Supabase to Local
```javascript
// The system automatically handles migration
// No manual steps required
```

## Security Notes

- Service role key has full database access
- Sessions contain sensitive authentication data
- RLS policies protect the sessions table
- Old sessions are automatically cleaned up

## Monitoring

### Logs to Watch
- Session storage/retrieval operations
- Supabase connection status
- Fallback to local storage events
- Session cleanup operations

### Key Metrics
- Session persistence success rate
- Supabase connection reliability
- Session cleanup frequency
- Authentication success rate
