# WhatsApp Backend API

A robust Node.js backend service for WhatsApp messaging using whatsapp-web.js with Express and session persistence.

## 🚀 Features

- **WhatsApp Integration**: Connect to WhatsApp Web using whatsapp-web.js
- **Session Persistence**: LocalAuth strategy for maintaining sessions
- **RESTful API**: Express-based API with consistent JSON responses
- **QR Code Generation**: Automatic QR code generation for authentication
- **Message Sending**: Send WhatsApp messages via API endpoints
- **Health Monitoring**: Built-in health check endpoints
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Cross-origin resource sharing enabled
- **Development Tools**: Hot reload with nodemon

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- WhatsApp mobile app for QR code scanning

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development mode (with hot reload)
   npm run dev

   # Production mode
   npm start
   ```

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# WhatsApp Configuration
CLIENT_ID=your-app-client-id
SESSION_PATH=./whatsapp-session

# Additional Configuration
LOG_LEVEL=info
```

### Configuration Options

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `CLIENT_ID`: Unique identifier for WhatsApp client
- `SESSION_PATH`: Directory for storing WhatsApp sessions
- `LOG_LEVEL`: Logging level (info, debug, error)

## 📡 API Endpoints

### Base URL
```
http://localhost:3001
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "WhatsApp Backend API",
    "status": "operational",
    "environment": "development",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.45,
    "version": "1.0.0",
    "port": 3001
  },
  "message": "Server is running and healthy"
}
```

### WhatsApp Status
```http
GET /api/whatsapp/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isReady": true,
    "connectionStatus": "ready",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "clientId": "default-client"
  },
  "message": "WhatsApp client is ready"
}
```

### QR Code
```http
GET /api/whatsapp/qr
```

**Response (when QR available):**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "connectionStatus": "qr_ready",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "message": "QR code available for scanning"
}
```

**Response (when authenticated):**
```json
{
  "success": true,
  "data": {
    "qrCode": null,
    "connectionStatus": "ready",
    "message": "WhatsApp is already authenticated"
  },
  "message": "WhatsApp client is already connected"
}
```

### Send Message
```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "number": "1234567890",
  "message": "Hello from WhatsApp API!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0C767D8F4C8E5@c.us",
    "timestamp": 1704067200,
    "to": "1234567890@c.us",
    "message": "Message sent successfully"
  },
  "message": "Message sent successfully"
}
```

### WhatsApp Health
```http
GET /api/whatsapp/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "WhatsApp API",
    "status": "operational",
    "connectionStatus": "ready",
    "isReady": true,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.45
  },
  "message": "WhatsApp service is operational"
}
```

## 🔧 Usage

### 1. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 2. Authenticate WhatsApp

1. **Check server status**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Get QR code**
   ```bash
   curl http://localhost:3001/api/whatsapp/qr
   ```

3. **Scan QR code** with your WhatsApp mobile app
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Tap "Link a Device"
   - Scan the QR code from the API response

4. **Verify authentication**
   ```bash
   curl http://localhost:3001/api/whatsapp/status
   ```

### 3. Send Messages

```bash
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from WhatsApp API!"
  }'
```

## 🧪 Testing

### Run API Tests

```bash
# Run all tests
node test-api.js

# Test with custom parameters
node test-api.js --url http://localhost:3001 --number 1234567890 --message "Test message"

# Show help
node test-api.js --help
```

### Test Endpoints

The test script validates:
- ✅ Health endpoint
- ✅ WhatsApp status endpoint
- ✅ QR code endpoint
- ✅ Message sending endpoint
- ✅ WhatsApp health endpoint
- ✅ Invalid endpoint handling
- ✅ Input validation

## 📁 Project Structure

```
whatsapp-backend/
├── src/
│   ├── server.js              # Main Express server
│   ├── whatsapp-client.js     # WhatsApp client manager
│   └── routes/
│       └── whatsapp.js        # WhatsApp API routes
├── .env                       # Environment variables
├── test-api.js                # API testing script
├── package.json
└── README.md
```

## 🔒 Security Considerations

### Production Deployment

1. **Environment Variables**
   - Use strong, unique CLIENT_ID values
   - Set NODE_ENV=production
   - Use HTTPS in production

2. **Authentication**
   - Implement API key authentication
   - Add rate limiting
   - Use proper CORS configuration

3. **Session Management**
   - Secure session storage
   - Regular session cleanup
   - Monitor session usage

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in .env
   PORT=3002
   ```

2. **WhatsApp client not ready**
   - Check if QR code is available
   - Ensure WhatsApp mobile app is connected
   - Verify session files are not corrupted

3. **Message sending fails**
   - Verify phone number format
   - Check WhatsApp client status
   - Ensure recipient number is valid

### Logs

Monitor server logs for detailed error information:
```bash
npm run dev
```

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review server logs
- Open an issue on GitHub

---

**Note**: This API uses whatsapp-web.js which is an unofficial WhatsApp Web API. Use responsibly and in compliance with WhatsApp's terms of service.
