# How to Forward Video to All Members

## What This Does
Forwards the latest video from +91 7396926840 to all 200 members in february_2026 table.

## Prerequisites
1. WhatsApp backend must be running: `cd whatsapp-backend && npm start`
2. WhatsApp must be authenticated (check: http://localhost:3001/api/whatsapp/status)
3. Source number must have sent a video message

## Step 1: Test Setup (Optional but Recommended)
```bash
node test-forward-setup.js
```
This checks if everything is ready. All 6 tests should pass.

## Step 2: Run the Forwarding Script
```bash
node forward-video-script.js
```

That's it! The script will:
- Fetch all 200 members from database
- Get the latest video from +91 7396926840
- Forward it to all members (takes ~5 minutes)
- Show progress logs in real-time

## What You'll See
```
[INFO] VIDEO FORWARDING SCRIPT - STARTED
[INFO] [STEP 1/4] Checking WhatsApp backend...
[SUCCESS] WhatsApp backend is ready
[INFO] [STEP 2/4] Fetching members from database...
[SUCCESS] Fetched 200 members from database
[INFO] [STEP 3/4] Getting latest video message...
[SUCCESS] Found video message
[INFO] [STEP 4/4] Forwarding video to all members...
[INFO] Progress: 10/200 forwarded
[INFO] Progress: 20/200 forwarded
...
[SUCCESS] FORWARDING COMPLETED!
[SUCCESS] Successfully Sent: 200
[SUCCESS] Failed: 0
[SUCCESS] SCRIPT COMPLETED SUCCESSFULLY!
```

## Troubleshooting
- **"WhatsApp not ready"** → Restart backend and authenticate
- **"No video found"** → Check source number sent a video
- **"Cannot connect"** → Check internet and backend running

## Notes
- Takes ~5-7 minutes total
- 1.5 second delay between each forward
- Logs show real-time progress
- Does NOT disrupt backend operations
