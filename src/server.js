/**
 * WhatsApp Backend Server
 * Main server file that initializes Express application and WhatsApp client
 * Provides REST API for WhatsApp Web integration
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import WhatsApp client and routes
const { initializeWhatsAppClient } = require('./whatsapp-client');
const whatsappRoutes = require('./routes/whatsapp');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Middleware Configuration
 * Sets up CORS, JSON parsing, logging, and static files
 */

// Enable CORS for all origins (adjust for production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON requests
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded requests
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined'));

// Serve static files (for testing purposes)
app.use('/static', express.static(path.join(__dirname, '../public')));

/**
 * API Routes Configuration
 * Sets up all application routes
 */

// Health check endpoint for the main server
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'WhatsApp Backend Server',
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// WhatsApp API routes
app.use('/api/whatsapp', whatsappRoutes);

// Root endpoint with API information
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'WhatsApp Backend API',
      version: '1.0.0',
      description: 'REST API for WhatsApp Web integration',
      endpoints: {
        health: '/health',
        whatsapp: {
          status: 'GET /api/whatsapp/status',
          qr: 'GET /api/whatsapp/qr',
          send: 'POST /api/whatsapp/send',
          restart: 'POST /api/whatsapp/restart',
          health: 'GET /api/whatsapp/health'
        }
      },
      documentation: 'See README.md for detailed API documentation'
    }
  });
});

// Handle 404 errors for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} does not exist`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Global error handler:', error);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

/**
 * Server Initialization
 * Starts the Express server and initializes WhatsApp client
 */

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM signal, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT signal, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log('\n🎉 ====================================');
  console.log('🚀 WhatsApp Backend server running!');
  console.log('🎉 ====================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api/whatsapp`);
  console.log(`📋 API docs: http://localhost:${PORT}/`);
  console.log('🎉 ====================================\n');

  // Initialize WhatsApp client after server is running
  console.log('🔄 Initializing WhatsApp client...');
  initializeWhatsAppClient();
});

// Export app for testing purposes
module.exports = app;
