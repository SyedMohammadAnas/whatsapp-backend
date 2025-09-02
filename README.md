# WhatsApp Backend API

A robust Node.js backend service that provides REST API integration with WhatsApp Web using `whatsapp-web.js`. This service allows you to send WhatsApp messages programmatically and manage WhatsApp Web sessions.

## 🚀 Features

- **QR Code Authentication**: Generate QR codes for WhatsApp Web login
- **Message Sending**: Send text messages to any WhatsApp number
- **Session Management**: Persistent session storage with automatic reconnection
- **Health Monitoring**: Built-in health checks and status monitoring
- **Docker Support**: Containerized deployment with Docker and Docker Compose
- **Clean Architecture**: Modular design with proper separation of concerns
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Cross-origin requests enabled for frontend integration

## 📋 Prerequisites

- Node.js 16+ (LTS recommended)
- npm or yarn package manager
- Docker and Docker Compose (for containerized deployment)
- WhatsApp account for authentication

## 🛠️ Installation

### Local Development

1. **Clone the repository** (if not already done)
2. **Navigate to the backend directory**:
   ```bash
   cd whatsapp-backend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Configure environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build and start the service**:
   ```bash
   docker-compose up -d
   ```

2. **View logs**:
   ```bash
   docker-compose logs -f whatsapp-backend
   ```

3. **Stop the service**:
   ```bash
   docker-compose down
   ```

## 🔧 Configuration

The service uses the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |
| `SESSION_PATH` | `./whatsapp-session` | WhatsApp session storage path |
| `CLIENT_ID` | `rafi-scheme-client` | WhatsApp client identifier |
| `LOG_LEVEL` | `info` | Logging level |
| `DEBUG` | `true` | Enable debug mode |

## 📚 API Documentation

### Base URL
- **Local**: `http://localhost:3001`
- **Docker**: `http://localhost:3001`

### Endpoints

#### 🏥 Health Check
```http
GET /health
```
Returns server health status and uptime information.

#### 📱 WhatsApp Endpoints

##### Get WhatsApp Status
```http
GET /api/whatsapp/status
```
Returns current WhatsApp connection status.

**Response:**
```json
{
  "success": true,
  "data": {
    "isReady": false,
    "status": "qr_ready",
    "hasQrCode": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

##### Get QR Code
```http
GET /api/whatsapp/qr
```
Returns QR code for WhatsApp Web authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "qr_ready",
    "message": "Scan this QR code with WhatsApp"
  }
}
```

##### Send Message
```http
POST /api/whatsapp/send
```

**Request Body:**
```json
{
  "number": "+1234567890",
  "message": "Hello from WhatsApp API!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0C431C1C4B2A8E6B3",
    "timestamp": 1640995200,
    "to": "+1234567890",
    "message": "Message sent successfully"
  }
}
```

##### Restart WhatsApp Client
```http
POST /api/whatsapp/restart
```
Restarts the WhatsApp client connection.

##### WhatsApp Service Health
```http
GET /api/whatsapp/health
```
Returns WhatsApp service-specific health information.

## 🧪 Testing

### Run API Tests
```bash
npm test
```

### Watch QR Code
```bash
node test-api.js --qr
```

### Manual Testing
Use tools like Postman, curl, or any HTTP client to test the endpoints.

**Example with curl:**
```bash
# Check status
curl http://localhost:3001/api/whatsapp/status

# Get QR code
curl http://localhost:3001/api/whatsapp/qr

# Send message
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"number": "+1234567890", "message": "Hello World!"}'
```

## 🔄 Connection Flow

1. **Start the service** - The WhatsApp client initializes
2. **Get QR code** - Call `/api/whatsapp/qr` to get the authentication QR code
3. **Scan QR code** - Use WhatsApp mobile app to scan the QR code
4. **Client ready** - Once authenticated, the client status becomes "ready"
5. **Send messages** - Use `/api/whatsapp/send` to send messages

## 🐳 Docker Configuration

### Development
```bash
# Build and run in development mode
docker-compose up --build
```

### Production
The service includes:
- Multi-stage Docker builds for optimization
- Health checks for container monitoring
- Persistent volumes for session storage
- Security hardening with non-root user
- Proper signal handling for graceful shutdowns

## 🔒 Security Considerations

- **Session Storage**: WhatsApp sessions are stored locally and persist between restarts
- **CORS**: Configure `ALLOWED_ORIGINS` for production use
- **Rate Limiting**: Consider adding rate limiting for production deployments
- **Authentication**: Add API authentication for production use
- **Network**: Use HTTPS and secure networks in production

## 🚨 Troubleshooting

### Common Issues

1. **QR Code Not Generating**
   - Ensure Puppeteer dependencies are installed
   - Check if ports are available
   - Verify Docker has sufficient resources

2. **Connection Failures**
   - Check internet connectivity
   - Verify WhatsApp Web is accessible
   - Try restarting the client: `POST /api/whatsapp/restart`

3. **Message Send Failures**
   - Ensure WhatsApp client is authenticated and ready
   - Verify phone numbers are in correct format (+countrycode + number)
   - Check if recipient allows messages from unknown numbers

4. **Docker Issues**
   - Ensure Docker daemon is running
   - Check if ports 3001 is available
   - Verify sufficient disk space for session storage

### Logs

View application logs:
```bash
# Docker
docker-compose logs -f whatsapp-backend

# Local
npm run dev
```

## 🏗️ Architecture

The backend follows a clean architecture pattern:

```
src/
├── server.js              # Main server and Express configuration
├── whatsapp-client.js     # WhatsApp client manager (no circular deps)
└── routes/
    └── whatsapp.js        # API route handlers
```

**Key Design Principles:**
- **Separation of Concerns**: Client management separate from routing
- **No Circular Dependencies**: Clean module imports and exports
- **Error Handling**: Comprehensive error handling at all levels
- **Logging**: Detailed logging for debugging and monitoring
- **Modularity**: Easy to extend and maintain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Related Links

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)

---

**Note**: This service uses WhatsApp Web's official web interface and complies with WhatsApp's terms of service. Use responsibly and respect WhatsApp's usage policies.
