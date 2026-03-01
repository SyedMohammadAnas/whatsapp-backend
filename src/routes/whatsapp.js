/**
 * WhatsApp API Routes
 * Express router for WhatsApp-related endpoints
 * Provides status, QR code, and message sending functionality
 */

const express = require('express');
const router = express.Router();

// Enhanced logging functions
const logger = {
    info: (message, emoji = 'ℹ️') => console.log(`${emoji} ${message}`),
    success: (message, emoji = '✅') => console.log(`${emoji} ${message}`),
    warning: (message, emoji = '⚠️') => console.log(`${emoji} ${message}`),
    error: (message, emoji = '❌') => console.log(`${emoji} ${message}`)
};

// Import WhatsApp client functions
const {
    getWhatsAppState,
    sendWhatsAppMessage,
    forceRestart,
    getSessionInfo,
    cleanupSessions,
    getMessagesFromChat,
    forwardMessage,
    detectLatestMedia,
    sendBulkMessage
} = require('../whatsapp-client');

// Import Supabase helper
const { getAllMembers, formatPhoneNumber } = require('../supabase-helper');

/**
 * GET /api/whatsapp/status
 * Returns current WhatsApp client status including readiness and connection status
 */
router.get('/status', async (req, res) => {
    try {
        logger.info('Status request received', '📊');

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
        logger.info('Send message request received', '📤');

        const { number, message } = req.body;

        // Validate input
        if (!number || !message) {
            const errorResponse = {
                success: false,
                error: 'Missing required fields',
                message: 'Phone number and message are required',
                timestamp: new Date().toISOString()
            };

            logger.warning('Send response sent: Missing fields');
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

            logger.success('Send response sent: Message sent');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Failed to send message',
                message: result.error,
                timestamp: result.timestamp
            };

            logger.error('Send response sent: Send failed');
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

        // Force restart
        const result = await forceRestart();

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

/**
 * GET /api/whatsapp/messages/:number
 * Get messages from a specific chat
 * Query params: limit (optional, default 10)
 */
router.get('/messages/:number', async (req, res) => {
    try {
        logger.info('Get messages request received', '📬');

        const { number } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        // Validate input
        if (!number) {
            const errorResponse = {
                success: false,
                error: 'Missing required fields',
                message: 'Phone number is required',
                timestamp: new Date().toISOString()
            };

            logger.warning('Get messages response sent: Missing fields');
            return res.status(400).json(errorResponse);
        }

        // Get messages
        const result = await getMessagesFromChat(number, limit);

        if (result.success) {
            const response = {
                success: true,
                data: {
                    messages: result.messages,
                    count: result.count,
                    chatId: result.chatId
                },
                message: 'Messages retrieved successfully'
            };

            logger.success('Get messages response sent: Messages retrieved');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Failed to get messages',
                message: result.error,
                timestamp: new Date().toISOString()
            };

            logger.error('Get messages response sent: Failed');
            res.status(503).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error getting messages:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/forward
 * Forward a message to specified recipients
 */
router.post('/forward', async (req, res) => {
    try {
        logger.info('Forward message request received', '📨');

        const { messageId, recipients } = req.body;

        // Validate input
        if (!messageId || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            const errorResponse = {
                success: false,
                error: 'Missing required fields',
                message: 'Message ID and recipients array are required',
                timestamp: new Date().toISOString()
            };

            logger.warning('Forward response sent: Missing fields');
            return res.status(400).json(errorResponse);
        }

        // Forward message
        const result = await forwardMessage(messageId, recipients);

        if (result.success) {
            const response = {
                success: true,
                data: {
                    sent: result.sent,
                    failed: result.failed,
                    total: result.total,
                    errors: result.errors
                },
                message: `Message forwarded to ${result.sent}/${result.total} recipients`
            };

            logger.success(`Forward response sent: ${result.sent}/${result.total} sent`);
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Failed to forward message',
                message: result.error,
                timestamp: new Date().toISOString()
            };

            logger.error('Forward response sent: Forward failed');
            res.status(503).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error forwarding message:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/whatsapp/community/detect-media
 * Detect the latest media message from the assistant number
 */
router.get('/community/detect-media', async (req, res) => {
    try {
        logger.info('Detect media request received', '🔍');

        // Assistant number
        const assistantNumber = '917396926840';

        // Detect latest media
        const result = await detectLatestMedia(assistantNumber);

        if (result.success) {
            const response = {
                success: true,
                data: result.data,
                message: 'Media detected successfully'
            };

            logger.success('Detect media response sent: Media found');
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'No media found',
                message: result.error,
                timestamp: new Date().toISOString()
            };

            logger.warning('Detect media response sent: No media');
            res.status(404).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error detecting media:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/community/message
 * Send a custom message to all members or test number
 */
router.post('/community/message', async (req, res) => {
    try {
        logger.info('Community message request received', '📨');

        const { message } = req.body;

        // Validate input
        if (!message || !message.trim()) {
            const errorResponse = {
                success: false,
                error: 'Missing required fields',
                message: 'Message is required',
                timestamp: new Date().toISOString()
            };

            logger.warning('Community message response sent: Missing message');
            return res.status(400).json(errorResponse);
        }

        // Get all members from Supabase
        const members = await getAllMembers();
        const recipients = members.map(member => formatPhoneNumber(member.mobile_number));
        logger.info(`Sending to ${recipients.length} members`, '📊');
        // Send bulk message
        const result = await sendBulkMessage(recipients, message);

        if (result.success !== false) {
            const response = {
                success: true,
                data: {
                    sent: result.sent,
                    failed: result.failed,
                    total: result.total,
                    errors: result.errors
                },
                message: `Message sent to ${result.sent}/${result.total} recipients`
            };

            logger.success(`Community message sent: ${result.sent}/${result.total}`);
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Failed to send message',
                message: result.error,
                timestamp: new Date().toISOString()
            };

            logger.error('Community message response sent: Failed');
            res.status(503).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error sending community message:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/whatsapp/community/media
 * Forward media to all members or test number
 */
router.post('/community/media', async (req, res) => {
    try {
        logger.info('Community media forward request received', '📨');

        const { messageId } = req.body;

        // Validate input
        if (!messageId) {
            const errorResponse = {
                success: false,
                error: 'Missing required fields',
                message: 'Message ID is required',
                timestamp: new Date().toISOString()
            };

            logger.warning('Community media response sent: Missing messageId');
            return res.status(400).json(errorResponse);
        }

        const members = await getAllMembers();
        const recipients = members.map(member => formatPhoneNumber(member.mobile_number));
        logger.info(`Forwarding to ${recipients.length} members`, '📊');

        // Forward message
        const result = await forwardMessage(messageId, recipients);

        if (result.success) {
            const response = {
                success: true,
                data: {
                    sent: result.sent,
                    failed: result.failed,
                    total: result.total,
                    errors: result.errors
                },
                message: `Media forwarded to ${result.sent}/${result.total} recipients`
            };

            logger.success(`Community media forwarded: ${result.sent}/${result.total}`);
            res.status(200).json(response);
        } else {
            const errorResponse = {
                success: false,
                error: 'Failed to forward media',
                message: result.error,
                timestamp: new Date().toISOString()
            };

            logger.error('Community media response sent: Failed');
            res.status(503).json(errorResponse);
        }

    } catch (error) {
        console.error('❌ Error forwarding community media:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
