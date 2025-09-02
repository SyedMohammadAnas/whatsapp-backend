/**
 * WhatsApp API Routes
 * Handles all WhatsApp-related HTTP endpoints
 * Uses the WhatsApp client manager for actual operations
 */

const express = require('express');
const router = express.Router();

// Import WhatsApp client functions (no circular dependency)
const {
  getWhatsAppState,
  getQrCode,
  sendWhatsAppMessage,
  isWhatsAppReady,
  getConnectionStatus,
  restartWhatsAppClient
} = require('../whatsapp-client');

/**
 * GET /api/whatsapp/status
 * Returns current WhatsApp connection status and state
 */
router.get('/status', (req, res) => {
  try {
    console.log('📊 Getting WhatsApp status...');

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

    console.log(`✅ Status retrieved: ${state.status}`);
  } catch (error) {
    console.error('❌ Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status',
      message: error.message
    });
  }
});

/**
 * GET /api/whatsapp/qr
 * Returns QR code for WhatsApp Web authentication
 */
router.get('/qr', (req, res) => {
  try {
    console.log('🔍 Getting QR code...');

    const state = getWhatsAppState();

    // Check if client is already connected
    if (state.isReady) {
      return res.json({
        success: true,
        data: {
          message: 'WhatsApp is already connected',
          isReady: true
        }
      });
    }

    // Check if QR code is available
    if (!state.hasQrCode) {
      return res.json({
        success: false,
        data: {
          message: 'QR code not ready yet. Please wait...',
          status: state.status
        }
      });
    }

    // Return QR code data
    res.json({
      success: true,
      data: {
        qrCode: state.qrCode,
        status: state.status,
        message: 'Scan this QR code with WhatsApp'
      }
    });

    console.log('✅ QR code sent successfully');
  } catch (error) {
    console.error('❌ Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code',
      message: error.message
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
    const { number, message } = req.body;

    // Validate input parameters
    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both number and message are required'
      });
    }

    console.log(`📤 Sending message to ${number}...`);

    // Check if WhatsApp is ready
    if (!isWhatsAppReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not ready',
        message: 'Please scan QR code first to connect WhatsApp'
      });
    }

    // Send the message using WhatsApp client
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
      console.log(`✅ Message sent successfully to ${number}`);
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send message',
        message: result.error
      });
      console.log(`❌ Failed to send message to ${number}: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Error in send message route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/whatsapp/restart
 * Restarts WhatsApp client connection
 */
router.post('/restart', async (req, res) => {
  try {
    console.log('🔄 Restarting WhatsApp client...');

    await restartWhatsAppClient();

    res.json({
      success: true,
      data: {
        message: 'WhatsApp client restart initiated',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ WhatsApp client restart initiated');
  } catch (error) {
    console.error('❌ Error restarting WhatsApp client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart WhatsApp client',
      message: error.message
    });
  }
});

/**
 * GET /api/whatsapp/health
 * Health check endpoint for WhatsApp service
 */
router.get('/health', (req, res) => {
  try {
    const status = getConnectionStatus();
    const isReady = isWhatsAppReady();

    res.json({
      success: true,
      data: {
        service: 'WhatsApp Backend',
        status: status,
        isReady: isReady,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error in health check:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Export the router for use in main server
module.exports = router;
