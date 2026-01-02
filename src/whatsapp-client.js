/**
 * WhatsApp Client Manager
 * Simplified client using whatsapp-web.js with LocalAuth for local session persistence only
 * Manages global states and provides WhatsApp messaging functionality
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Global state management
let whatsappClient = null;
let isClientReady = false;
let connectionStatus = 'disconnected';
let qrCodeData = null;
let sessionCheckInterval = null;

/**
 * Validate session directory and create if needed
 * @returns {boolean} True if session directory is valid
 */
const validateSessionDirectory = () => {
    try {
        const sessionPath = process.env.SESSION_PATH || './whatsapp-session';

        // Create session directory if it doesn't exist
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
            console.log(`📁 Created session directory: ${sessionPath}`);
        }

        // Check if directory is writable
        const testFile = path.join(sessionPath, '.test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        console.log(`✅ Session directory validated: ${sessionPath}`);
        return true;
    } catch (error) {
        console.error(`❌ Session directory validation failed: ${error.message}`);
        return false;
    }
};

/**
 * Clean up corrupted session files
 * @returns {Promise<void>}
 */
const cleanupCorruptedSessions = async () => {
    try {
        const sessionPath = process.env.SESSION_PATH || './whatsapp-session';

        if (!fs.existsSync(sessionPath)) {
            return;
        }

        const files = fs.readdirSync(sessionPath);
        let cleanedCount = 0;

        for (const file of files) {
            const filePath = path.join(sessionPath, file);
            const stats = fs.statSync(filePath);

            // Remove files older than 7 days or corrupted session files
            const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

            if (daysOld > 7 || file.includes('.corrupted')) {
                fs.unlinkSync(filePath);
                cleanedCount++;
                console.log(`🧹 Cleaned up old/corrupted file: ${file}`);
            }
        }

        if (cleanedCount > 0) {
            console.log(`✅ Cleaned up ${cleanedCount} old/corrupted session files`);
        }
    } catch (error) {
        console.error(`❌ Error cleaning up sessions: ${error.message}`);
    }
};

/**
 * Check session health and validate connection
 * @returns {Promise<boolean>} True if session is healthy
 */
const checkSessionHealth = async () => {
    try {
        if (!whatsappClient || !isClientReady) {
            return false;
        }

        // Check if client is still connected
        const state = await whatsappClient.getState();
        return state === 'CONNECTED';
    } catch (error) {
        console.error(`❌ Session health check failed: ${error.message}`);
        return false;
    }
};

/**
 * Handle WhatsApp client failure and restart
 * @returns {Promise<void>}
 */
const handleClientFailure = async () => {
    console.log('🛑 Terminating backend process due to WhatsApp client failure - will auto-restart');

    // Stop health checks
    stopSessionHealthChecks();

    // Disconnect client if it exists
    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
        } catch (error) {
            console.log(`⚠️ Error destroying client during termination: ${error.message}`);
        }
    }

    // Exit the process with error code to trigger auto-restart
    process.exit(1);
};

/**
 * Start periodic session health checks
 */
const startSessionHealthChecks = () => {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }

    sessionCheckInterval = setInterval(async () => {
        try {
            const isHealthy = await checkSessionHealth();

            if (!isHealthy && isClientReady) {
                console.log('⚠️ Session health check failed, terminating for auto-restart...');
                await handleClientFailure();
            }
        } catch (error) {
            console.error(`❌ Session health check error: ${error.message}`);
        }
    }, 60000); // Check every minute

    console.log('✅ Session health checks started');
};

/**
 * Stop periodic session health checks
 */
const stopSessionHealthChecks = () => {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
        console.log('🛑 Session health checks stopped');
    }
};

/**
 * Initialize WhatsApp client with LocalAuth for local session persistence only
 * Sets up event handlers for authentication and connection status
 */
const initializeWhatsAppClient = async () => {
    try {
        console.log('🤖 Initializing WhatsApp client...');

        // Validate session directory
        if (!validateSessionDirectory()) {
            throw new Error('Session directory validation failed');
        }

        // Clean up corrupted sessions
        await cleanupCorruptedSessions();

        // Reset reconnection attempts on fresh initialization
        reconnectAttempts = 0;

        // Create new client instance with LocalAuth only
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
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            },
            // Enhanced timeout settings
            qrMaxRetries: 5,
            authTimeoutMs: 60000,
            takeoverOnConflict: true,
            takeoverTimeoutMs: 10000
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
            reconnectAttempts = 0; // Reset reconnection attempts on successful auth
        });

        // Event handler: Client ready
        whatsappClient.on('ready', () => {
            console.log('🚀 WhatsApp client is ready!');
            isClientReady = true;
            connectionStatus = 'ready';
            qrCodeData = null; // Clear QR code when ready
            reconnectAttempts = 0; // Reset reconnection attempts

            // Start session health checks
            startSessionHealthChecks();
        });

        // Event handler: Authentication failure
        whatsappClient.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
            isClientReady = false;
            connectionStatus = 'auth_failure';
            qrCodeData = null;

            // Stop health checks
            stopSessionHealthChecks();

            // Immediately terminate and restart
            setTimeout(handleClientFailure, 1000);
        });

        // Event handler: Client disconnected
        whatsappClient.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp client disconnected:', reason);
            isClientReady = false;
            connectionStatus = 'disconnected';
            qrCodeData = null;

            // Stop health checks
            stopSessionHealthChecks();

            // Immediately terminate and restart instead of attempting reconnection
            if (reason !== 'MANUAL_DISCONNECT') {
                console.log('🛑 Terminating backend process due to disconnection - will auto-restart');
                process.exit(1);
            }
        });

        // Event handler: Loading screen
        whatsappClient.on('loading_screen', (percent, message) => {
            console.log(`📱 Loading: ${percent}% - ${message}`);
            connectionStatus = 'loading';
        });

        // Event handler: Message received (for connection validation)
        whatsappClient.on('message', (message) => {
            // Optional: Log received messages for debugging
            console.log(`📨 Message received from ${message.from}: ${message.body.substring(0, 50)}...`);
        });

        // Initialize the client
        await whatsappClient.initialize();
        console.log('✅ WhatsApp client initialization completed');

    } catch (error) {
        console.error('❌ Error initializing WhatsApp client:', error.message);
        connectionStatus = 'error';

        // Stop health checks
        stopSessionHealthChecks();

        console.log(`🛑 Terminating backend process due to initialization failure`);
        // Exit the process with error code to trigger auto-restart
        process.exit(1);
    }
};

/**
 * Get current WhatsApp client state
 * @returns {Object} Current state including readiness, connection status, QR code, and session details
 */
const getWhatsAppState = () => {
    return {
        isReady: isClientReady,
        connectionStatus: connectionStatus,
        qrCode: qrCodeData,
        timestamp: new Date().toISOString(),
        clientId: process.env.CLIENT_ID || 'default-client',
        // Session information
        sessionInfo: {
            sessionPath: process.env.SESSION_PATH || './whatsapp-session',
            healthChecksActive: sessionCheckInterval !== null
        }
    };
};

/**
 * Force manual restart of WhatsApp client
 * @returns {Promise<Object>} Result object with success status
 */
const forceRestart = async () => {
    try {
        console.log('🔄 Manual restart requested...');

        // Stop health checks
        stopSessionHealthChecks();

        // Terminate for auto-restart
        await handleClientFailure();

        return {
            success: true,
            message: 'Restart initiated',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Manual restart failed:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Get detailed session information
 * @returns {Promise<Object>} Detailed session information
 */
const getSessionInfo = async () => {
    try {
        const sessionPath = process.env.SESSION_PATH || './whatsapp-session';
        const sessionFiles = [];

        if (fs.existsSync(sessionPath)) {
            const files = fs.readdirSync(sessionPath);

            for (const file of files) {
                const filePath = path.join(sessionPath, file);
                const stats = fs.statSync(filePath);

                sessionFiles.push({
                    name: file,
                    size: stats.size,
                    modified: stats.mtime,
                    age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
                });
            }
        }

        const state = getWhatsAppState();

        return {
            success: true,
            data: {
                ...state,
                sessionFiles: sessionFiles,
                sessionDirectory: sessionPath,
                sessionDirectoryExists: fs.existsSync(sessionPath),
                sessionDirectoryWritable: (() => {
                    try {
                        const testFile = path.join(sessionPath, '.test');
                        fs.writeFileSync(testFile, 'test');
                        fs.unlinkSync(testFile);
                        return true;
                    } catch {
                        return false;
                    }
                })()
            },
            message: 'Session information retrieved successfully'
        };

    } catch (error) {
        console.error('❌ Error getting session info:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Clean up session directory
 * @returns {Promise<Object>} Result object with cleanup status
 */
const cleanupSessions = async () => {
    try {
        console.log('🧹 Manual session cleanup requested...');

        await cleanupCorruptedSessions();

        return {
            success: true,
            message: 'Session cleanup completed',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Session cleanup failed:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
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
 * Disconnect WhatsApp client and clean up all resources
 * @returns {Promise<void>}
 */
const disconnectWhatsAppClient = async () => {
    try {
        console.log('🛑 Disconnecting WhatsApp client...');

        // Stop health checks
        stopSessionHealthChecks();

        if (whatsappClient) {
            await whatsappClient.destroy();
            whatsappClient = null;
            isClientReady = false;
            connectionStatus = 'disconnected';
            qrCodeData = null;
            reconnectAttempts = 0;
            console.log('✅ WhatsApp client disconnected successfully');
        } else {
            console.log('ℹ️ WhatsApp client was already disconnected');
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
    qrCodeData,
    forceRestart,
    getSessionInfo,
    cleanupSessions
};
