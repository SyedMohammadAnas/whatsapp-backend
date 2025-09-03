/**
 * WhatsApp API Routes
 * Express router for WhatsApp-related endpoints
 * Provides status, QR code, and message sending functionality
 */

const express = require('express');
const router = express.Router();

// Import WhatsApp client functions
const {
    getWhatsAppState,
    sendWhatsAppMessage,
    forceReconnection,
    getSessionInfo,
    cleanupSessions
} = require('../whatsapp-client');

/**
 * GET /api/whatsapp/status
 * Returns current WhatsApp client status including readiness and connection status
 */
router.get('/status', async (req, res) => {
    try {
        console.log('📊 Status request received');

        // Get current WhatsApp state
        const state = getWhatsAppState();

        // Prepare response
        const response = {
            success: true,
            data: {
                isReady: state.isReady,
                connectionStatus: state.connectionStatus,
                timestamp: state.timestamp,
                clientId: state.clientId
            },
            message: `WhatsApp client is ${state.connectionStatus}`
        };

        console.log('✅ Status response sent:', response.message);
        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error getting status:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get WhatsApp status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/whatsapp/qr
 * Returns QR code for WhatsApp authentication (if available)
 */
router.get('/qr', async (req, res) => {
    try {
        console.log('📱 QR code request received');

        // Get current WhatsApp state
        const state = getWhatsAppState();

        // Check if client is already authenticated
        if (state.connectionStatus === 'ready' || state.connectionStatus === 'authenticated') {
            const response = {
                success: true,
                data: {
                    qrCode: null,
                    connectionStatus: state.connectionStatus,
                    message: 'WhatsApp is already authenticated'
                },
                message: 'WhatsApp client is already connected'
            };

            console.log('✅ QR response sent: Already authenticated');
            return res.status(200).json(response);
        }

        // Check if QR code is available
        if (state.qrCode && state.connectionStatus === 'qr_ready') {
            const response = {
                success: true,
                data: {
                    qrCode: state.qrCode,
                    connectionStatus: state.connectionStatus,
                    timestamp: state.timestamp
                },
                message: 'QR code available for scanning'
            };

            console.log('✅ QR response sent: QR code available');
            return res.status(200).json(response);
        }

        // No QR code available
        const response = {
            success: false,
            error: 'QR code not available',
            data: {
                connectionStatus: state.connectionStatus,
                timestamp: state.timestamp
            },
            message: `QR code not available. Current status: ${state.connectionStatus}`
        };

        console.log('❌ QR response sent: QR code not available');
        res.status(404).json(response);

    } catch (error) {
        console.error('❌ Error getting QR code:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get QR code',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/send
 * Sends WhatsApp message to specified number
 * Body: { number: string, message: string }
 */
router.post('/send', async (req, res) => {
    try {
        console.log('📤 Send message request received');

        // Extract and validate request body
        const { number, message } = req.body;

        // Input validation
        if (!number || !message) {
            const errorResponse = {
                success: false,
                error: 'Missing required fields',
                message: 'Phone number and message are required',
                timestamp: new Date().toISOString()
            };

            console.log('❌ Send response sent: Missing fields');
            return res.status(400).json(errorResponse);
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanNumber = number.replace(/[^\d+]/g, '');

        if (!phoneRegex.test(cleanNumber)) {
            const errorResponse = {
                success: false,
                error: 'Invalid phone number format',
                message: 'Please provide a valid phone number in international format',
                timestamp: new Date().toISOString()
            };

            console.log('❌ Send response sent: Invalid phone number');
            return res.status(400).json(errorResponse);
        }

        // Validate message length
        if (message.length > 4096) {
            const errorResponse = {
                success: false,
                error: 'Message too long',
                message: 'Message must be 4096 characters or less',
                timestamp: new Date().toISOString()
            };

            console.log('❌ Send response sent: Message too long');
            return res.status(400).json(errorResponse);
        }

        console.log(`📤 Attempting to send message to ${cleanNumber}`);

        // Send message using WhatsApp client
        const result = await sendWhatsAppMessage(cleanNumber, message);

        if (result.success) {
            const response = {
                success: true,
                data: {
                    messageId: result.messageId,
                    timestamp: result.timestamp,
                    to: result.to,
                    message: result.message
                },
                message: 'Message sent successfully'
            };

            console.log('✅ Send response sent: Message sent successfully');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: result.error,
                message: 'Failed to send message',
                timestamp: result.timestamp
            };

            console.log('❌ Send response sent: Failed to send message');
            res.status(500).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error sending message:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/whatsapp/health
 * Health check endpoint for WhatsApp service
 */
router.get('/health', async (req, res) => {
    try {
        console.log('🏥 WhatsApp health check requested');

        const state = getWhatsAppState();

        const response = {
            success: true,
            data: {
                service: 'WhatsApp API',
                status: 'operational',
                connectionStatus: state.connectionStatus,
                isReady: state.isReady,
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            },
            message: 'WhatsApp service is operational'
        };

        console.log('✅ Health check response sent');
        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error in health check:', error.message);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/whatsapp/session-info
 * Returns detailed session information including files and directory status
 */
router.get('/session-info', async (req, res) => {
    try {
        console.log('📊 Session info request received');

        const sessionInfo = await getSessionInfo();

        if (sessionInfo.success) {
            console.log('✅ Session info response sent');
            res.status(200).json(sessionInfo);
        } else {
            console.log('❌ Session info response sent: Failed to get session info');
            res.status(500).json(sessionInfo);
        }

    } catch (error) {
        console.error('❌ Error getting session info:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get session info',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/reconnect
 * Forces manual reconnection of WhatsApp client
 */
router.post('/reconnect', async (req, res) => {
    try {
        console.log('🔄 Manual reconnection request received');

        const result = await forceReconnection();

        if (result.success) {
            const response = {
                success: true,
                data: {
                    message: result.message,
                    timestamp: result.timestamp
                },
                message: 'Reconnection initiated successfully'
            };

            console.log('✅ Reconnection response sent: Reconnection initiated');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: result.error,
                message: 'Failed to initiate reconnection',
                timestamp: result.timestamp
            };

            console.log('❌ Reconnection response sent: Failed to reconnect');
            res.status(500).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error during reconnection:', error.message);
        res.status(500).json({
            success: false,
            error: 'Reconnection failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/cleanup-sessions
 * Manually cleans up corrupted and old session files
 */
router.post('/cleanup-sessions', async (req, res) => {
    try {
        console.log('🧹 Session cleanup request received');

        const result = await cleanupSessions();

        if (result.success) {
            const response = {
                success: true,
                data: {
                    message: result.message,
                    timestamp: result.timestamp
                },
                message: 'Session cleanup completed successfully'
            };

            console.log('✅ Cleanup response sent: Cleanup completed');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: result.error,
                message: 'Failed to cleanup sessions',
                timestamp: result.timestamp
            };

            console.log('❌ Cleanup response sent: Cleanup failed');
            res.status(500).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error during session cleanup:', error.message);
        res.status(500).json({
            success: false,
            error: 'Session cleanup failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
