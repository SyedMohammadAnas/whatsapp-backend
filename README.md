# WhatsApp Backend API

A local WhatsApp backend API built with Node.js, Express, and whatsapp-web.js for managing WhatsApp messaging functionality.

## Features

- WhatsApp Web integration using whatsapp-web.js
- Local session persistence using LocalAuth
- QR code generation for WhatsApp authentication
- Message sending functionality
- Session health monitoring and automatic reconnection
- RESTful API endpoints
- CORS enabled for frontend integration

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- WhatsApp account for authentication

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whatsapp-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# WhatsApp Configuration
CLIENT_ID=rafi-scheme-manager
SESSION_PATH=./whatsapp-session

# Additional Configuration
LOG_LEVEL=info
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode with Auto-Restart
```bash
npm run auto-start
# or
npm start  # Use start.bat for Windows
```

### Production Mode (Single Run)
```bash
npm start
```

**Note:** For production use, it's recommended to use `npm run auto-start` which will automatically restart the server if it terminates due to connectivity issues.

### Testing
```bash
npm test
```

## API Endpoints

### Health Check
- `GET /health` - Check server health

### WhatsApp Endpoints
- `GET /api/whatsapp/status` - Get WhatsApp client status
- `GET /api/whatsapp/qr` - Get QR code for authentication
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/whatsapp/health` - Check WhatsApp client health
- `GET /api/whatsapp/session-info` - Get session information
- `POST /api/whatsapp/reconnect` - Force reconnection
- `POST /api/whatsapp/cleanup-sessions` - Clean up session files

## Session Management

The application uses local file storage for session persistence. Session files are stored in the `./whatsapp-session` directory (configurable via `SESSION_PATH`).

### Session Files
- Session data is automatically saved and loaded
- Corrupted or old sessions are automatically cleaned up
- Session health is monitored and reconnection is attempted on failures

## Authentication

1. Start the server
2. Access the QR code endpoint: `GET /api/whatsapp/qr`
3. Scan the QR code with your WhatsApp mobile app
4. The client will automatically authenticate and be ready for messaging

## Message Sending

Send messages using the `/api/whatsapp/send` endpoint:

```json
{
  "number": "1234567890",
  "message": "Hello from WhatsApp API!"
}
```

## Error Handling

The application includes comprehensive error handling:
- Automatic reconnection on disconnection
- Session health monitoring
- Graceful error responses
- Detailed logging

## Development

### Project Structure
```
src/
├── server.js              # Main server file
├── whatsapp-client.js     # WhatsApp client management
└── routes/
    └── whatsapp.js        # WhatsApp API routes
```

## CloudFlare Initiate

cloudflared tunnel --url http://localhost:3001

### Logging

The application uses Morgan for HTTP request logging and console logging for WhatsApp events and errors.

## License

ISC
