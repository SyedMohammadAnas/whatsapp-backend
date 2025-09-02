/**
 * WhatsApp Client Manager
 * Singleton client using whatsapp-web.js with LocalAuth for session persistence
 * Manages global states and provides WhatsApp messaging functionality
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');

// Global state management
let whatsappClient = null;
let isClientReady = false;
let connectionStatus = 'disconnected';
let qrCodeData = null;

/**
 * Initialize WhatsApp client with LocalAuth for session persistence
 * Sets up event handlers for authentication and connection status
 */
const initializeWhatsAppClient = async () => {
    try {
        console.log('🤖 Initializing WhatsApp client...');

        // Create new client instance with LocalAuth
        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                clientId: process.env.CLIENT_ID || 'default-client',
                dataPath: process.env.SESSION_PATH || './whatsapp-session'
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
                    '--disable-gpu'
                ]
            }
        });

        // Event handler: QR code generation
        whatsappClient.on('qr', async (qr) => {
            console.log('📱 QR Code received, generating DataURL...');
            try {
                // Generate QR code as DataURL
                qrCodeData = await QRCode.toDataURL(qr);
                connectionStatus = 'qr_ready';
                console.log('✅ QR Code generated successfully');
            } catch (error) {
                console.error('❌ Error generating QR code:', error.message);
                connectionStatus = 'qr_error';
            }
        });

        // Event handler: Authentication successful
        whatsappClient.on('authenticated', () => {
            console.log('✅ WhatsApp client authenticated successfully');
            connectionStatus = 'authenticated';
            qrCodeData = null; // Clear QR code after authentication
        });

        // Event handler: Client ready
        whatsappClient.on('ready', () => {
            console.log('🚀 WhatsApp client is ready!');
            isClientReady = true;
            connectionStatus = 'ready';
            qrCodeData = null; // Clear QR code when ready
        });

        // Event handler: Authentication failure
        whatsappClient.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
            isClientReady = false;
            connectionStatus = 'auth_failure';
            qrCodeData = null;
        });

        // Event handler: Client disconnected
        whatsappClient.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp client disconnected:', reason);
            isClientReady = false;
            connectionStatus = 'disconnected';
            qrCodeData = null;
        });

        // Event handler: Loading screen
        whatsappClient.on('loading_screen', (percent, message) => {
            console.log(`📱 Loading: ${percent}% - ${message}`);
            connectionStatus = 'loading';
        });

        // Initialize the client
        await whatsappClient.initialize();
        console.log('✅ WhatsApp client initialization completed');

    } catch (error) {
        console.error('❌ Error initializing WhatsApp client:', error.message);
        connectionStatus = 'error';
        throw error;
    }
};

/**
 * Get current WhatsApp client state
 * @returns {Object} Current state including readiness, connection status, and QR code
 */
const getWhatsAppState = () => {
    return {
        isReady: isClientReady,
        connectionStatus: connectionStatus,
        qrCode: qrCodeData,
        timestamp: new Date().toISOString(),
        clientId: process.env.CLIENT_ID || 'default-client'
    };
};

/**
 * Send WhatsApp message to a specific number
 * @param {string} number - Phone number in international format (e.g., "1234567890@c.us")
 * @param {string} message - Message content to send
 * @returns {Promise<Object>} Result object with success status and message
 */
const sendWhatsAppMessage = async (number, message) => {
    try {
        // Validate client readiness
        if (!isClientReady || !whatsappClient) {
            throw new Error('WhatsApp client is not ready');
        }

        // Validate inputs
        if (!number || !message) {
            throw new Error('Phone number and message are required');
        }

        // Format phone number if needed (add @c.us suffix if not present)
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

        console.log(`📤 Sending message to ${formattedNumber}: ${message}`);

        // Send message using WhatsApp client
        const result = await whatsappClient.sendMessage(formattedNumber, message);

        console.log('✅ Message sent successfully');

        return {
            success: true,
            messageId: result.id._serialized,
            timestamp: result.timestamp,
            to: formattedNumber,
            message: 'Message sent successfully'
        };

    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Disconnect WhatsApp client
 * @returns {Promise<void>}
 */
const disconnectWhatsAppClient = async () => {
    try {
        if (whatsappClient) {
            await whatsappClient.destroy();
            whatsappClient = null;
            isClientReady = false;
            connectionStatus = 'disconnected';
            qrCodeData = null;
            console.log('✅ WhatsApp client disconnected successfully');
        }
    } catch (error) {
        console.error('❌ Error disconnecting WhatsApp client:', error.message);
    }
};

// Export functions and state
module.exports = {
    initializeWhatsAppClient,
    getWhatsAppState,
    sendWhatsAppMessage,
    disconnectWhatsAppClient,
    // Export state for direct access if needed
    isClientReady,
    connectionStatus,
    qrCodeData
};
