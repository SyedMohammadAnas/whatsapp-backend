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

// Logging middleware
app.use(morgan('combined', {
    format: ':method :url :status :res[content-length] - :response-time ms',
    stream: {
        write: (message) => {
            console.log(`📝 ${message.trim()}`);
        }
    }
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

    console.log('🏥 Health check requested');
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
                    health: '/api/whatsapp/health'
                }
            }
        },
        message: 'Welcome to WhatsApp Backend API'
    };

    console.log('🏠 Root endpoint accessed');
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

    console.log(`❌ 404 Error: Route ${req.originalUrl} not found`);
    res.status(404).json(errorData);
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Global error handler:', error);

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
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Close server
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Start server
const server = app.listen(PORT, async () => {
    console.log('🚀 Server starting...');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    try {
        // Initialize WhatsApp client after server starts
        console.log('🤖 Initializing WhatsApp client...');
        await initializeWhatsAppClient();
        console.log('✅ WhatsApp client initialized successfully');

        console.log('🎉 Server is ready to handle requests!');
        console.log('📋 Available endpoints:');
        console.log('   • GET  /health');
        console.log('   • GET  /api/whatsapp/status');
        console.log('   • GET  /api/whatsapp/qr');
        console.log('   • POST /api/whatsapp/send');
        console.log('   • GET  /api/whatsapp/health');

    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp client:', error.message);
        console.log('⚠️  Server is running but WhatsApp client is not available');
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
