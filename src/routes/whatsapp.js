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

        // QR code not available
        const response = {
            success: false,
            data: {
                qrCode: null,
                connectionStatus: state.connectionStatus,
                timestamp: state.timestamp
            },
            message: 'QR code not available. Please wait for WhatsApp client to initialize.'
        };

        console.log('⚠️ QR response sent: QR code not available');
        res.status(503).json(response);

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
 * Sends a WhatsApp message to a specified phone number
 */
router.post('/send', async (req, res) => {
    try {
        console.log('📤 Send message request received');

        const { number, message } = req.body;

        // Validate input
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

        // Send message
        const result = await sendWhatsAppMessage(number, message);

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

            console.log('✅ Send response sent: Message sent');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Failed to send message',
                message: result.error,
                timestamp: result.timestamp
            };

            console.log('❌ Send response sent: Send failed');
            res.status(503).json(errorResponse);
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
 * Returns detailed health information about the WhatsApp client
 */
router.get('/health', async (req, res) => {
    try {
        console.log('🏥 WhatsApp health check requested');

        // Get current WhatsApp state
        const state = getWhatsAppState();

        // Prepare health response
        const healthData = {
            success: true,
            data: {
                isReady: state.isReady,
                connectionStatus: state.connectionStatus,
                timestamp: state.timestamp,
                clientId: state.clientId,
                sessionInfo: state.sessionInfo
            },
            message: `WhatsApp client health: ${state.connectionStatus}`
        };

        // Set appropriate status code based on health
        const statusCode = state.isReady ? 200 : 503;

        console.log('✅ Health response sent:', healthData.message);
        res.status(statusCode).json(healthData);

    } catch (error) {
        console.error('❌ Error getting health status:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to get health status',
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
        console.log('📋 Session info request received');

        // Get detailed session information
        const sessionInfo = await getSessionInfo();

        if (sessionInfo.success) {
            console.log('✅ Session info response sent');
            res.status(200).json(sessionInfo);
        } else {
            console.log('❌ Session info response sent: Error');
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
 * Forces manual reconnection of the WhatsApp client
 */
router.post('/reconnect', async (req, res) => {
    try {
        console.log('🔄 Manual reconnection request received');

        // Force reconnection
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

            console.log('✅ Reconnect response sent: Reconnection initiated');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Reconnection failed',
                message: result.error,
                timestamp: result.timestamp
            };

            console.log('❌ Reconnect response sent: Reconnection failed');
            res.status(503).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error during reconnection:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/cleanup-sessions
 * Manually triggers session cleanup
 */
router.post('/cleanup-sessions', async (req, res) => {
    try {
        console.log('🧹 Manual session cleanup request received');

        // Clean up sessions
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
                error: 'Cleanup failed',
                message: result.error,
                timestamp: result.timestamp
            };

            console.log('❌ Cleanup response sent: Cleanup failed');
            res.status(503).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error during session cleanup:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
