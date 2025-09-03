# WhatsApp Backend API

A robust WhatsApp backend service built with Node.js, Express, and whatsapp-web.js with enhanced session management capabilities.

## Features

### Core WhatsApp Functionality
- **Message Sending**: Send WhatsApp messages to any phone number
- **QR Code Authentication**: Secure QR code-based authentication
- **Session Persistence**: Automatic session storage and recovery
- **Real-time Status**: Monitor connection and authentication status

### Enhanced Session Management
- **Automatic Reconnection**: Intelligent reconnection on disconnection
- **Session Health Monitoring**: Periodic health checks every minute
- **Session Validation**: Directory and file integrity validation
- **Corrupted Session Cleanup**: Automatic cleanup of old/corrupted sessions
- **Manual Session Control**: API endpoints for manual session management
- **Detailed Session Information**: Comprehensive session diagnostics

## Session Management Features

### Automatic Features
- **Session Directory Validation**: Creates and validates session directory on startup
- **Corrupted Session Cleanup**: Removes session files older than 7 days
- **Health Checks**: Monitors session health every 60 seconds
- **Automatic Reconnection**: Attempts reconnection up to 5 times with exponential backoff
- **Session Recovery**: Recovers from authentication failures and disconnections

### Manual Control Endpoints
- **Session Information**: Get detailed session diagnostics
- **Manual Reconnection**: Force client reconnection
- **Session Cleanup**: Manually trigger session cleanup

## API Endpoints

### Core Endpoints
- `GET /health` - Server health check
- `GET /api/whatsapp/status` - WhatsApp client status
- `GET /api/whatsapp/qr` - Get QR code for authentication
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET /api/whatsapp/health` - WhatsApp service health check

### Session Management Endpoints
- `GET /api/whatsapp/session-info` - Detailed session information
- `POST /api/whatsapp/reconnect` - Force manual reconnection
- `POST /api/whatsapp/cleanup-sessions` - Manual session cleanup

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file with required configuration
4. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

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

## Session Management Details

### Session Directory Structure
```
whatsapp-session/
├── .wwebjs_auth/
│   ├── session-rafi-scheme-manager/
│   │   ├── session.json
│   │   └── tokens.json
└── .wwebjs_cache/
    └── session-rafi-scheme-manager/
```

### Session States
- `disconnected` - Client is not connected
- `qr_ready` - QR code available for scanning
- `authenticated` - Authentication successful
- `ready` - Client ready to send messages
- `loading` - Client is loading
- `reconnecting` - Attempting to reconnect
- `auth_failure` - Authentication failed
- `error` - Error occurred
- `max_reconnect_exceeded` - Max reconnection attempts reached

### Reconnection Logic
- **Max Attempts**: 5 reconnection attempts
- **Initial Delay**: 5 seconds after disconnection
- **Retry Delay**: 30 seconds between attempts
- **Reset Conditions**: Successful authentication or manual reset

### Health Check Features
- **Frequency**: Every 60 seconds
- **Validation**: Checks client state and connection
- **Auto Recovery**: Triggers reconnection on health failure
- **Manual Override**: Can be controlled via API endpoints

## Usage Examples

### Send a Message
```bash
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from WhatsApp API!"
  }'
```

### Get Session Information
```bash
curl http://localhost:3001/api/whatsapp/session-info
```

### Force Reconnection
```bash
curl -X POST http://localhost:3001/api/whatsapp/reconnect
```

### Clean Up Sessions
```bash
curl -X POST http://localhost:3001/api/whatsapp/cleanup-sessions
```

## Error Handling

### Common Error Scenarios
- **Session Directory Issues**: Automatic creation and validation
- **Authentication Failures**: Automatic retry with exponential backoff
- **Network Disconnections**: Intelligent reconnection logic
- **Corrupted Sessions**: Automatic cleanup and recovery
- **Memory Issues**: Proper resource cleanup and management

### Error Recovery
- **Automatic**: Built-in recovery mechanisms
- **Manual**: API endpoints for manual intervention
- **Monitoring**: Comprehensive logging and status reporting

## Deployment

### Railway Deployment
The application is configured for Railway deployment with:
- Automatic session persistence
- Environment variable configuration
- Health check endpoints
- Graceful shutdown handling

### Environment Considerations
- **Session Storage**: Persistent session directory
- **Memory Management**: Proper cleanup of resources
- **Error Handling**: Comprehensive error recovery
- **Monitoring**: Health checks and status endpoints

## Troubleshooting

### Common Issues
1. **QR Code Not Appearing**: Check session directory permissions
2. **Authentication Failures**: Clear session directory and restart
3. **Connection Issues**: Use manual reconnection endpoint
4. **Memory Issues**: Monitor session cleanup and restart if needed

### Debug Endpoints
- `/api/whatsapp/session-info` - Detailed diagnostics
- `/api/whatsapp/health` - Service health status
- `/api/whatsapp/status` - Connection status

## Security Considerations

- **Session Isolation**: Each client ID has separate sessions
- **Directory Permissions**: Proper file system permissions
- **Error Logging**: Secure error handling without sensitive data exposure
- **Input Validation**: Comprehensive input validation and sanitization

## Performance Optimization

- **Session Caching**: Efficient session storage and retrieval
- **Connection Pooling**: Optimized connection management
- **Memory Management**: Proper cleanup and resource management
- **Health Monitoring**: Proactive health checks prevent issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License
