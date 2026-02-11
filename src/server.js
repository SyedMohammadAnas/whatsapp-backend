/**
 * Main Express Server
 * Entry point for WhatsApp backend API
 * Handles middleware, routes, error handling, and WhatsApp client initialization
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Import WhatsApp client and routes
const { initializeWhatsAppClient } = require('./whatsapp-client');
const whatsappRoutes = require('./routes/whatsapp');

// Create Express app instance
const app = express();

// Get port from environment variables with fallback
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Enhanced logging functions
const logger = {
    info: (message, emoji = 'ℹ️') => console.log(`${emoji} ${message}`),
    success: (message, emoji = '✅') => console.log(`${emoji} ${message}`),
    warning: (message, emoji = '⚠️') => console.log(`${emoji} ${message}`),
    error: (message, emoji = '❌') => console.log(`${emoji} ${message}`),
    section: (title) => console.log(`\n┌─ ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}┐`),
    sectionEnd: () => console.log('└' + '─'.repeat(52) + '┘'),
    divider: () => console.log('├' + '─'.repeat(52) + '┤'),
    banner: (text) => console.log(`\n╔${'═'.repeat(54)}╗\n║${text.padStart((54 + text.length) / 2).padEnd(54)}║\n╚${'═'.repeat(54)}╝`)
};

// Middleware Configuration
// CORS - Allow all origins for development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware with 10MB limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced logging middleware with better formatting
app.use(morgan((tokens, req, res) => {
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const status = tokens.status(req, res);
    const responseTime = tokens['response-time'](req, res);
    const contentLength = tokens.res(req, res, 'content-length') || '-';

    // Color coding based on status
    let statusIcon = '✅';
    if (status >= 400 && status < 500) statusIcon = '⚠️';
    if (status >= 500) statusIcon = '❌';

    // Format timestamp nicely
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return `${statusIcon} [${timeStr}] ${method} ${url} → ${status} (${responseTime}ms, ${contentLength}B)`;
}, {
    skip: (req, res) => req.url === '/health' // Skip health check logs for cleaner output
}));

// Request timestamp middleware
app.use((req, res, next) => {
    req.timestamp = new Date().toISOString();
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthData = {
        success: true,
        data: {
            service: 'WhatsApp Backend API',
            status: 'operational',
            environment: NODE_ENV,
            timestamp: req.timestamp,
            uptime: process.uptime(),
            version: '1.0.0',
            port: PORT
        },
        message: 'Server is running and healthy'
    };

    logger.info('Health check received', '🏥');
    res.status(200).json(healthData);
});

// Root endpoint
app.get('/', (req, res) => {
    const welcomeData = {
        success: true,
        data: {
            service: 'WhatsApp Backend API',
            version: '1.0.0',
            environment: NODE_ENV,
            timestamp: req.timestamp,
            endpoints: {
                health: '/health',
                whatsapp: {
                    status: '/api/whatsapp/status',
                    qr: '/api/whatsapp/qr',
                    send: '/api/whatsapp/send',
                    health: '/api/whatsapp/health',
                    sessionInfo: '/api/whatsapp/session-info',
                    reconnect: '/api/whatsapp/reconnect',
                    cleanupSessions: '/api/whatsapp/cleanup-sessions'
                }
            }
        },
        message: 'Welcome to WhatsApp Backend API'
    };

    logger.info('Root endpoint accessed', '🏠');
    res.status(200).json(welcomeData);
});

// Mount WhatsApp routes
app.use('/api/whatsapp', whatsappRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
    const errorData = {
        success: false,
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist`,
        timestamp: req.timestamp,
        availableEndpoints: {
            health: '/health',
            whatsapp: '/api/whatsapp'
        }
    };

    logger.warning(`Route not found: ${req.originalUrl}`, '❌');
    res.status(404).json(errorData);
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error(`Global error handler: ${error.message}`, '💥');

    const errorData = {
        success: false,
        error: 'Internal server error',
        message: NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: req.timestamp,
        ...(NODE_ENV === 'development' && { stack: error.stack })
    };

    res.status(500).json(errorData);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    logger.warning(`Received ${signal}, initiating graceful shutdown...`, '🛑');

    // Close server
    server.close(() => {
        logger.success('HTTP server closed gracefully');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down', '💥');
        process.exit(1);
    }, 10000);
};

// Start server
const server = app.listen(PORT, async () => {
    logger.banner('WHATSAPP BACKEND SERVER');

    logger.section('SERVER INITIALIZATION');
    logger.info(`Starting server on port ${PORT}`, '🚀');
    logger.info(`Environment: ${NODE_ENV}`, '🌍');
    logger.info(`Started at: ${new Date().toLocaleString()}`, '⏰');

    try {
        // Initialize WhatsApp client after server starts
        logger.divider();
        logger.info('Initializing WhatsApp client...', '🤖');
        await initializeWhatsAppClient();
        logger.success('WhatsApp client initialized successfully!');

        logger.divider();
        logger.success('Server is ready to handle requests!', '🎉');

        logger.section('AVAILABLE ENDPOINTS');
        logger.info('GET  /health', '📊');
        logger.info('GET  /api/whatsapp/status', '📱');
        logger.info('GET  /api/whatsapp/qr', '📷');
        logger.info('POST /api/whatsapp/send', '📤');
        logger.info('GET  /api/whatsapp/health', '🏥');
        logger.info('GET  /api/whatsapp/session-info', '📋');
        logger.info('POST /api/whatsapp/reconnect', '🔄');
        logger.info('POST /api/whatsapp/cleanup-sessions', '🧹');
        logger.sectionEnd();

    } catch (error) {
        logger.error(`Failed to initialize WhatsApp client: ${error.message}`);
        logger.warning('Server is running but WhatsApp client is not available');
    }
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
    }
});

// Register graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
