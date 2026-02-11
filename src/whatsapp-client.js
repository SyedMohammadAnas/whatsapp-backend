/**
 * WhatsApp Client Manager
 * Simplified client using whatsapp-web.js with LocalAuth for local session persistence only
 * Manages global states and provides WhatsApp messaging functionality
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

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

// Global state management
let whatsappClient = null;
let isClientReady = false;
let connectionStatus = 'disconnected';
let qrCodeData = null;
let sessionCheckInterval = null;
let loadingProgress = 0; // Track WhatsApp Web loading progress

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
            logger.info(`Created session directory: ${sessionPath}`, '📁');
        }

        // Check if directory is writable
        const testFile = path.join(sessionPath, '.test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        logger.success(`Session directory validated: ${sessionPath}`);
        return true;
    } catch (error) {
        logger.error(`Session directory validation failed: ${error.message}`);
        return false;
    }
};

/**
 * Clean up corrupted session files (DISABLED - preserving existing sessions)
 * @returns {Promise<void>}
 */
const cleanupCorruptedSessions = async () => {
    // DISABLED: Not cleaning up sessions to preserve existing authentication
    console.log('ℹ️ Session cleanup disabled - preserving existing WhatsApp session');
};

/**
 * Check session health and validate connection
 * @returns {Promise<boolean>} True if session is healthy
 */
const checkSessionHealth = async () => {
    try {
        if (!whatsappClient || !isClientReady) {
            console.log('⚠️ Session health check: Client not ready or initialized');
            return false;
        }

        // Check if client is still connected
        const state = await whatsappClient.getState();

        // Valid states that indicate a healthy connection
        const validStates = ['CONNECTED', 'OPEN', 'CONNECTED_READY'];

        if (validStates.includes(state)) {
            logger.success(`Session health check passed: State is ${state}`);
            return true;
        } else {
            logger.warning(`Session health check: Invalid state '${state}' (expected: ${validStates.join(', ')})`);
            return false;
        }

    } catch (error) {
        logger.error(`Session health check error: ${error.message}`);
        return false;
    }
};

/**
 * Handle WhatsApp client failure and restart
 * @returns {Promise<void>}
 */
const handleClientFailure = async () => {
    logger.warning('Terminating backend process due to WhatsApp client failure - will auto-restart', '🛑');

    // Stop health checks
    stopSessionHealthChecks();

    // Disconnect client if it exists
    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
        } catch (error) {
            logger.warning(`Error destroying client during termination: ${error.message}`);
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
                // Double-check health after a short delay to avoid false positives
                console.log('⚠️ Session health check failed, waiting 30 seconds for potential recovery...');
                await new Promise(resolve => setTimeout(resolve, 30000));

                const isStillHealthy = await checkSessionHealth();
                if (!isStillHealthy && isClientReady) {
                    console.log('⚠️ Session health check still failing after grace period, terminating for auto-restart...');
                    await handleClientFailure();
                } else {
                    console.log('✅ Session recovered during grace period');
                }
            }
        } catch (error) {
            console.error(`❌ Session health check error: ${error.message}`);
        }
    }, 300000); // Check every 5 minutes

    logger.success('Session health checks started');
};

/**
 * Stop periodic session health checks
 */
const stopSessionHealthChecks = () => {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
        logger.info('Session health checks stopped', '🛑');
    }
};

/**
 * Initialize WhatsApp client with LocalAuth for local session persistence only
 * Sets up event handlers for authentication and connection status
 */
const initializeWhatsAppClient = async () => {
    try {
        logger.section('WHATSAPP CLIENT INITIALIZATION');
        logger.info('Initializing WhatsApp client...', '🤖');

        // Validate session directory
        if (!validateSessionDirectory()) {
            throw new Error('Session directory validation failed');
        }

        // Session cleanup disabled to preserve existing authentication
        logger.info('Session cleanup disabled - preserving existing WhatsApp session');

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
                ],
                timeout: 120000 // 2 minutes timeout for browser operations
            },
            // Enhanced timeout settings - give it more time to load WhatsApp Web
            qrMaxRetries: 5,
            authTimeoutMs: 120000, // 2 minutes for authentication
            takeoverOnConflict: true,
            takeoverTimeoutMs: 30000, // 30 seconds for takeover
            restartOnAuthFail: true
        });

        // Event handler: QR code generation
        whatsappClient.on('qr', async (qr) => {
            logger.info('QR Code received, generating DataURL...', '📱');
            try {
                // Generate QR code as DataURL
                qrCodeData = await QRCode.toDataURL(qr);
                connectionStatus = 'qr_ready';
                logger.success('QR Code generated successfully');
            } catch (error) {
                logger.error(`Error generating QR code: ${error.message}`);
                connectionStatus = 'qr_error';
            }
        });

        // Event handler: Authentication successful
        whatsappClient.on('authenticated', async () => {
            logger.success('WhatsApp client authenticated successfully');
            logger.info('Testing WhatsApp client functionality...', '⏳');
            connectionStatus = 'authenticated';
            qrCodeData = null; // Clear QR code after authentication
            reconnectAttempts = 0; // Reset reconnection attempts on successful auth

            // Aggressive functionality check - test if client can actually work
            const testClientReady = async (attempt = 1) => {
                if (isClientReady) return; // Already ready from ready event

                try {
                    // Wait a bit before first attempt
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    logger.info(`Testing client (attempt ${attempt}/20)...`, '🔍');

                    // Try to get the client state
                    const state = await whatsappClient.getState();
                    logger.info(`Client state: ${state}`, '📊');

                    if (state === 'CONNECTED') {
                        // Try a simple operation to verify it really works
                        try {
                            await whatsappClient.pupPage.evaluate(() => window.WWebJS !== undefined);
                            logger.success('✅ WhatsApp client is functional and ready!', '🚀');
                            isClientReady = true;
                            connectionStatus = 'ready';
                            loadingProgress = 100;
                            startSessionHealthChecks();
                            logger.sectionEnd();
                            return;
                        } catch (testError) {
                            logger.warning(`Client not fully loaded yet: ${testError.message.split('\\n')[0]}`);
                        }
                    }

                    // Retry if not ready and under attempt limit
                    if (attempt < 20) {
                        setTimeout(() => testClientReady(attempt + 1), 3000);
                    } else {
                        logger.error('❌ Client failed to become ready after 20 attempts');
                    }

                } catch (error) {
                    logger.warning(`Test attempt ${attempt} failed: ${error.message.split('\\n')[0]}`);
                    if (attempt < 20) {
                        setTimeout(() => testClientReady(attempt + 1), 3000);
                    }
                }
            };

            // Start testing
            testClientReady();
        });

        // Event handler: Client ready (fired by whatsapp-web.js when truly ready)
        whatsappClient.on('ready', () => {
            logger.success('WhatsApp client ready event received!', '🚀');
            isClientReady = true;
            connectionStatus = 'ready';
            qrCodeData = null; // Clear QR code when ready
            reconnectAttempts = 0; // Reset reconnection attempts
            loadingProgress = 100; // Mark as fully loaded

            // Start session health checks
            startSessionHealthChecks();
            logger.sectionEnd();
        });

        // Event handler: Authentication failure
        whatsappClient.on('auth_failure', (msg) => {
            logger.error(`WhatsApp authentication failed: ${msg}`);
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
            logger.warning(`WhatsApp client disconnected: ${reason}`, '🔌');
            isClientReady = false;
            connectionStatus = 'disconnected';
            qrCodeData = null;

            // Stop health checks
            stopSessionHealthChecks();

            // Immediately terminate and restart instead of attempting reconnection
            if (reason !== 'MANUAL_DISCONNECT') {
                logger.warning('Terminating backend process due to disconnection - will auto-restart', '🛑');
                process.exit(1);
            }
        });

        // Event handler: Loading screen
        whatsappClient.on('loading_screen', (percent, message) => {
            loadingProgress = percent;
            logger.info(`Loading WhatsApp Web: ${percent}% - ${message}`, '⏳');
            connectionStatus = 'loading';

            // When loading reaches 100%, client is fully ready
            if (percent === 100) {
                logger.success('WhatsApp Web fully loaded (100%)!', '✅');

                // Give it a moment to fully settle
                setTimeout(() => {
                    if (!isClientReady) {
                        logger.success('Setting client as ready after full load', '🚀');
                        isClientReady = true;
                        connectionStatus = 'ready';
                        startSessionHealthChecks();
                    }
                }, 3000); // Wait 3 seconds after 100% before declaring ready
            }
        });

        // Event handler: Message received (for connection validation only)
        whatsappClient.on('message', (message) => {
            // Message received - connection is active, no logging needed for individual messages
        });

        // Initialize the client
        await whatsappClient.initialize();
        logger.success('WhatsApp client initialization completed');

    } catch (error) {
        logger.error(`Error initializing WhatsApp client: ${error.message}`);
        connectionStatus = 'error';

        // Stop health checks
        stopSessionHealthChecks();

        logger.warning('Terminating backend process due to initialization failure', '🛑');
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

        logger.info(`Sending message to ${formattedNumber}`, '📤');

        // Get the chat first to ensure it exists
        const chatId = formattedNumber;

        // Send message using WhatsApp client
        const result = await whatsappClient.sendMessage(chatId, message);

        // Show message preview (first 100 chars) for successful sends
        const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
        logger.success(`Message sent successfully: "${messagePreview}"`);

        return {
            success: true,
            messageId: result.id._serialized,
            timestamp: result.timestamp,
            to: formattedNumber,
            message: 'Message sent successfully'
        };

    } catch (error) {
        logger.error(`Error sending WhatsApp message: ${error.message}`);
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

/**
 * Get messages from a specific chat
 * @param {string} number - Phone number to get messages from
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Object>} Result object with messages
 */
const getMessagesFromChat = async (number, limit = 10) => {
    try {
        // Validate client readiness
        if (!isClientReady || !whatsappClient) {
            throw new Error('WhatsApp client is not ready');
        }

        // Format phone number
        const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;

        logger.info(`Fetching ${limit} messages from ${formattedNumber}`, '📬');

        // Get the chat
        const chat = await whatsappClient.getChatById(formattedNumber);

        // Fetch messages
        const messages = await chat.fetchMessages({ limit });

        // Format messages for response
        const formattedMessages = messages.map(msg => ({
            id: msg.id._serialized,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            type: msg.type,
            isForwarded: msg.isForwarded,
            mediaKey: msg.mediaKey
        }));

        logger.success(`Retrieved ${formattedMessages.length} messages from ${formattedNumber}`);

        return {
            success: true,
            messages: formattedMessages,
            count: formattedMessages.length,
            chatId: formattedNumber
        };

    } catch (error) {
        logger.error(`Error getting messages from chat: ${error.message}`);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Forward a message to multiple recipients
 * @param {string} messageId - Serialized message ID to forward
 * @param {Array<string>} recipients - Array of phone numbers to forward to
 * @returns {Promise<Object>} Result object with forwarding status
 */
const forwardMessage = async (messageId, recipients) => {
    try {
        // Validate client readiness
        if (!isClientReady || !whatsappClient) {
            throw new Error('WhatsApp client is not ready');
        }

        logger.info(`Forwarding message ${messageId} to ${recipients.length} recipients`, '📨');

        // Get the message by ID
        const msg = await whatsappClient.getMessageById(messageId);

        if (!msg) {
            throw new Error('Message not found');
        }

        const results = {
            success: true,
            sent: 0,
            failed: 0,
            total: recipients.length,
            errors: []
        };

        // Forward to each recipient
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            const formattedRecipient = recipient.includes('@c.us') ? recipient : `${recipient}@c.us`;

            try {
                // Forward the message
                await msg.forward(formattedRecipient);
                results.sent++;

                // Log progress every 10 messages
                if ((i + 1) % 10 === 0 || i === recipients.length - 1) {
                    logger.info(`Progress: ${i + 1}/${recipients.length} forwarded`, '📊');
                }

                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                results.failed++;
                results.errors.push({
                    recipient: formattedRecipient,
                    error: error.message
                });
                logger.warning(`Failed to forward to ${formattedRecipient}: ${error.message}`);
            }
        }

        logger.success(`Forwarding completed: ${results.sent} sent, ${results.failed} failed`);

        return results;

    } catch (error) {
        logger.error(`Error forwarding message: ${error.message}`);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
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
    cleanupSessions,
    getMessagesFromChat,
    forwardMessage
};
