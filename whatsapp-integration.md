# WhatsApp Web.js Integration Guide

A complete step-by-step guide for integrating WhatsApp Web.js into Node.js applications for automated message sending.

## 📋 Overview

This guide covers how to build a robust WhatsApp backend service using `whatsapp-web.js` library that can:
- Generate QR codes for authentication
- Send messages programmatically
- Handle session persistence
- Provide REST API endpoints
- Deploy with Docker

## 🛠️ Step-by-Step Implementation

### Step 1: Project Setup

```bash
# Create project directory
mkdir whatsapp-backend
cd whatsapp-backend

# Initialize npm project
npm init -y
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install whatsapp-web.js express cors dotenv qrcode morgan

# Development dependencies
npm install nodemon --save-dev

# Testing dependency
npm install axios
```

### Step 3: Project Structure

Create the following directory structure:
```
whatsapp-backend/
├── src/
│   ├── server.js              # Main server file
│   ├── whatsapp-client.js     # WhatsApp client manager
│   └── routes/
│       └── whatsapp.js        # API routes
├── package.json
├── docker-compose.yml
├── Dockerfile
├── .env
├── test-api.js               # API testing script
└── README.md
```

### Step 4: Create WhatsApp Client Manager

**File: `src/whatsapp-client.js`**

Key principles:
- ✅ **No circular dependencies** - Standalone module
- ✅ **Global state management** - Store client state in module variables
- ✅ **Proper event handling** - Handle all WhatsApp events
- ✅ **Error handling** - Comprehensive error management

```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

// Global state variables
let client = null;
let qrCodeData = null;
let isClientReady = false;
let connectionStatus = 'disconnected';

function initializeWhatsAppClient() {
  console.log('🚀 Initializing WhatsApp client...');

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-session',
      clientId: 'your-app-client-id'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  // Event handlers
  client.on('qr', async (qr) => {
    qrCodeData = await qrcode.toDataURL(qr);
    connectionStatus = 'qr_ready';
  });

  client.on('authenticated', () => {
    connectionStatus = 'authenticated';
  });

  client.on('ready', () => {
    isClientReady = true;
    connectionStatus = 'ready';
    qrCodeData = null;
  });

  client.on('auth_failure', () => {
    connectionStatus = 'auth_failed';
    qrCodeData = null;
  });

  client.on('disconnected', () => {
    isClientReady = false;
    connectionStatus = 'disconnected';
    qrCodeData = null;
  });

  client.initialize();
}

function getWhatsAppState() {
  return {
    isReady: isClientReady,
    status: connectionStatus,
    qrCode: qrCodeData,
    hasQrCode: qrCodeData !== null
  };
}

async function sendWhatsAppMessage(number, message) {
  if (!isClientReady || !client) {
    return {
      success: false,
      error: 'WhatsApp client is not ready. Please scan QR code first.'
    };
  }

  try {
    const chatId = number.includes('@') ? number : `${number}@c.us`;
    const sentMessage = await client.sendMessage(chatId, message);

    return {
      success: true,
      messageId: sentMessage.id._serialized,
      timestamp: sentMessage.timestamp,
      to: number
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initializeWhatsAppClient,
  getWhatsAppState,
  sendWhatsAppMessage,
  // ... other functions
};
```

### Step 5: Create API Routes

**File: `src/routes/whatsapp.js`**

Key principles:
- ✅ **Import functions only** - No circular dependencies
- ✅ **Proper error handling** - Try-catch blocks
- ✅ **Consistent response format** - Standardized JSON responses
- ✅ **Input validation** - Check required fields

```javascript
const express = require('express');
const router = express.Router();

const {
  getWhatsAppState,
  sendWhatsAppMessage,
  // ... other imports
} = require('../whatsapp-client');

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  try {
    const state = getWhatsAppState();
    res.json({
      success: true,
      data: {
        isReady: state.isReady,
        status: state.status,
        hasQrCode: state.hasQrCode,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status',
      message: error.message
    });
  }
});

// GET /api/whatsapp/qr
router.get('/qr', (req, res) => {
  try {
    const state = getWhatsAppState();

    if (state.isReady) {
      return res.json({
        success: true,
        data: { message: 'WhatsApp is already connected', isReady: true }
      });
    }

    if (!state.hasQrCode) {
      return res.json({
        success: false,
        data: { message: 'QR code not ready yet. Please wait...', status: state.status }
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: state.qrCode,
        status: state.status,
        message: 'Scan this QR code with WhatsApp'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code',
      message: error.message
    });
  }
});

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both number and message are required'
      });
    }

    const result = await sendWhatsAppMessage(number, message);

    if (result.success) {
      res.json({
        success: true,
        data: {
          messageId: result.messageId,
          timestamp: result.timestamp,
          to: result.to,
          message: 'Message sent successfully'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send message',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
```

### Step 6: Create Main Server

**File: `src/server.js`**

```javascript
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { initializeWhatsAppClient } = require('./whatsapp-client');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Routes
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'WhatsApp Backend Server',
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

app.use('/api/whatsapp', whatsappRoutes);

// Error handling
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} does not exist`
  });
});

app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Backend server running on port ${PORT}`);
  initializeWhatsAppClient();
});

module.exports = app;
```

### Step 7: Docker Configuration

**File: `Dockerfile`**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS production
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont curl

WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S whatsapp -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=whatsapp:nodejs . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN mkdir -p whatsapp-session logs && chown -R whatsapp:nodejs whatsapp-session logs

USER whatsapp
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
```

**File: `docker-compose.yml`**

```yaml
services:
  whatsapp-backend:
    build: .
    container_name: whatsapp-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - whatsapp-session:/app/whatsapp-session
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - whatsapp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  whatsapp-session:
    driver: local

networks:
  whatsapp-network:
    driver: bridge
```

### Step 8: Environment Configuration

**File: `.env`**

```env
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=*
SESSION_PATH=./whatsapp-session
CLIENT_ID=your-app-client-id
LOG_LEVEL=info
DEBUG=true
```

### Step 9: Testing Script

**File: `test-api.js`**

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testEndpoints() {
  const tests = [
    { name: 'Health Check', method: 'GET', url: '/health' },
    { name: 'WhatsApp Status', method: 'GET', url: '/api/whatsapp/status' },
    { name: 'Get QR Code', method: 'GET', url: '/api/whatsapp/qr' },
    {
      name: 'Send Message',
      method: 'POST',
      url: '/api/whatsapp/send',
      data: { number: '+1234567890', message: 'Test message' }
    }
  ];

  for (const test of tests) {
    try {
      const config = {
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        timeout: 10000
      };

      if (test.data) {
        config.data = test.data;
        config.headers = { 'Content-Type': 'application/json' };
      }

      const response = await axios(config);
      console.log(`✅ ${test.name}: PASSED (${response.status})`);
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED (${error.response?.status || 0})`);
    }
  }
}

if (require.main === module) {
  testEndpoints();
}
```

## 🚀 Deployment Steps

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build and start container
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-backend

# Stop container
docker-compose down
```

## 🔄 Usage Flow

1. **Start the service** - Server initializes and WhatsApp client starts
2. **Get QR code** - Call `GET /api/whatsapp/qr` to get authentication QR
3. **Scan QR code** - Use WhatsApp mobile app to scan the QR code
4. **Client ready** - Once authenticated, client status becomes "ready"
5. **Send messages** - Use `POST /api/whatsapp/send` to send messages

## 🔧 Common Issues & Solutions

### Issue: "getWhatsAppState is not a function"
**Solution**: Circular dependency - ensure WhatsApp client functions are properly exported and imported without circular references.

### Issue: QR Code not generating
**Solutions**:
- Ensure Puppeteer dependencies are installed
- Check if ports are available
- Verify Docker has sufficient resources

### Issue: Message sending fails
**Solutions**:
- Ensure WhatsApp client is authenticated and ready
- Verify phone numbers are in correct format (+countrycode + number)
- Check if recipient allows messages from unknown numbers

### Issue: Docker build fails
**Solutions**:
- Ensure Docker daemon is running
- Check if ports are available
- Verify sufficient disk space

## 📚 Key Architecture Principles

1. **Separation of Concerns**: Keep WhatsApp client logic separate from routing
2. **No Circular Dependencies**: Import functions, not modules that import each other
3. **Error Handling**: Comprehensive error handling at all levels
4. **Session Persistence**: Store sessions to avoid re-authentication
5. **Health Monitoring**: Include health checks for monitoring
6. **Security**: Use non-root users in Docker, proper CORS configuration

## 🔗 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/whatsapp/status` | WhatsApp connection status |
| GET | `/api/whatsapp/qr` | Get QR code for authentication |
| POST | `/api/whatsapp/send` | Send message to WhatsApp number |

## 📝 Notes

- **Session Storage**: WhatsApp sessions persist between restarts in `./whatsapp-session` directory
- **Rate Limiting**: Consider adding rate limiting for production use
- **Authentication**: Add API authentication for production deployments
- **Monitoring**: Use health checks and logging for production monitoring
- **Compliance**: Ensure compliance with WhatsApp's terms of service

---

This guide provides a complete foundation for WhatsApp Web.js integration that can be adapted for various project requirements.
