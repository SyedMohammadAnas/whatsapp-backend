#!/usr/bin/env node

/**
 * ONE-TIME VIDEO FORWARDING SCRIPT
 *
 * This script forwards the latest video message from a specific WhatsApp number
 * to all scheme members in the current month (February 2026).
 *
 * Requirements:
 * - WhatsApp backend must be running on http://localhost:3001
 * - WhatsApp must be authenticated and ready
 * - Supabase credentials must be configured
 *
 * Usage:
 * node forward-video-script.js
 */

const https = require('https');
const http = require('http');

// ==================== CONFIGURATION ====================

// Source number to get the video from (format: with country code, without +)
const SOURCE_NUMBER = '917396926840';

// WhatsApp API configuration
const WHATSAPP_API_BASE = 'http://localhost:3001';

// Supabase configuration (from .env file)
const SUPABASE_URL = 'https://dnoceszgtfqapxzjoawh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub2Nlc3pndGZxYXB4empvYXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTU2ODMsImV4cCI6MjA3NzQ3MTY4M30.BEyY6pehM-zmGrX45NCOFnXbuwYprf6xPiTdcfXmJlA';

// Current month table (February 2026)
const CURRENT_MONTH_TABLE = 'february_2026';

// ==================== HELPER FUNCTIONS ====================

/**
 * Make HTTP request helper
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = protocol.request(reqOptions, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

/**
 * Logger utility with symbols
 */
const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`[SUCCESS] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    warning: (msg) => console.warn(`[WARNING] ${msg}`),
    progress: (current, total, name) => console.log(`[PROGRESS] ${current}/${total} - Forwarding to: ${name}`)
};

/**
 * Check if WhatsApp backend is ready
 */
async function checkWhatsAppStatus() {
    try {
        logger.info('Checking WhatsApp backend status...');

        const response = await makeRequest(`${WHATSAPP_API_BASE}/api/whatsapp/status`);

        if (response.status !== 200 || !response.data.success) {
            throw new Error('WhatsApp backend is not responding correctly');
        }

        const isReady = response.data.data.isReady;
        const status = response.data.data.connectionStatus;

        logger.info(`WhatsApp Status: ${status} (Ready: ${isReady})`);

        if (!isReady) {
            throw new Error(`WhatsApp is not ready. Current status: ${status}`);
        }

        logger.success('WhatsApp backend is ready');
        return true;

    } catch (error) {
        logger.error(`WhatsApp status check failed: ${error.message}`);
        throw error;
    }
}

/**
 * Get all members from Supabase for the current month
 */
async function getAllMembers() {
    try {
        logger.info(`Fetching all members from ${CURRENT_MONTH_TABLE} table...`);

        const url = `${SUPABASE_URL}/rest/v1/${CURRENT_MONTH_TABLE}?select=id,full_name,mobile_number,token_number`;

        const response = await makeRequest(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch members: HTTP ${response.status}`);
        }

        const members = response.data;
        logger.success(`Fetched ${members.length} members from database`);

        return members;

    } catch (error) {
        logger.error(`Failed to get members: ${error.message}`);
        throw error;
    }
}

/**
 * Get the latest video message from the source number
 */
async function getLatestVideoMessage() {
    try {
        logger.info(`Getting latest messages from ${SOURCE_NUMBER}...`);

        const response = await makeRequest(
            `${WHATSAPP_API_BASE}/api/whatsapp/messages/${SOURCE_NUMBER}?limit=20`
        );

        if (response.status !== 200 || !response.data.success) {
            throw new Error('Failed to get messages from chat');
        }

        const messages = response.data.data.messages;
        logger.info(`Retrieved ${messages.length} messages from source chat`);

        // Find the latest media message
        const mediaMessage = messages.find(msg => msg.hasMedia);

        if (!mediaMessage) {
            throw new Error('No media message found in the latest messages');
        }

        logger.success(`Found media message: ID=${mediaMessage.id}, Timestamp=${mediaMessage.timestamp}`);

        return mediaMessage;

    } catch (error) {
        logger.error(`Failed to get video message: ${error.message}`);
        throw error;
    }
}

/**
 * Forward message to all members
 */
async function forwardToAllMembers(messageId, members) {
    try {
        logger.info(`Starting to forward message to ${members.length} members...`);
        logger.info(`Message ID: ${messageId}`);

        // Prepare recipient list (format phone numbers properly)
        const recipients = members.map(member => {
            // Remove all non-digit characters
            let cleaned = member.mobile_number.replace(/\D/g, '');

            // Add 91 prefix if needed
            if (!cleaned.startsWith('91') && cleaned.length === 10) {
                cleaned = '91' + cleaned;
            }

            return cleaned;
        });

        logger.info(`Prepared ${recipients.length} recipient phone numbers`);

        // Forward the message via WhatsApp API
        const response = await makeRequest(
            `${WHATSAPP_API_BASE}/api/whatsapp/forward`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    messageId: messageId,
                    recipients: recipients
                }
            }
        );

        if (response.status !== 200 || !response.data.success) {
            throw new Error(`Forward request failed: ${response.data.message || 'Unknown error'}`);
        }

        const result = response.data.data;

        logger.success('='.repeat(60));
        logger.success(`FORWARDING COMPLETED!`);
        logger.success(`Total Members: ${result.total}`);
        logger.success(`Successfully Sent: ${result.sent}`);
        logger.success(`Failed: ${result.failed}`);
        logger.success('='.repeat(60));

        if (result.failed > 0) {
            logger.warning(`${result.failed} messages failed to send:`);
            result.errors.forEach(err => {
                logger.warning(`  - ${err.recipient}: ${err.error}`);
            });
        }

        return result;

    } catch (error) {
        logger.error(`Failed to forward messages: ${error.message}`);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('\n');
    logger.info('='.repeat(60));
    logger.info('VIDEO FORWARDING SCRIPT - STARTED');
    logger.info('='.repeat(60));
    logger.info(`Source Number: +${SOURCE_NUMBER}`);
    logger.info(`Target Month Table: ${CURRENT_MONTH_TABLE}`);
    logger.info(`WhatsApp API: ${WHATSAPP_API_BASE}`);
    logger.info('='.repeat(60));
    console.log('\n');

    try {
        // Step 1: Check WhatsApp backend status
        logger.info('[STEP 1/4] Checking WhatsApp backend...');
        await checkWhatsAppStatus();
        console.log('\n');

        // Step 2: Get all members from database
        logger.info('[STEP 2/4] Fetching members from database...');
        const members = await getAllMembers();
        console.log('\n');

        // Step 3: Get the latest video message
        logger.info('[STEP 3/4] Getting latest video message...');
        const videoMessage = await getLatestVideoMessage();
        console.log('\n');

        // Step 4: Forward to all members
        logger.info('[STEP 4/4] Forwarding video to all members...');
        logger.warning('This will take approximately ' + Math.ceil(members.length * 1.5 / 60) + ' minutes (1.5s delay per message)');
        console.log('\n');

        const result = await forwardToAllMembers(videoMessage.id, members);

        console.log('\n');
        logger.success('='.repeat(60));
        logger.success('SCRIPT COMPLETED SUCCESSFULLY!');
        logger.success('='.repeat(60));
        console.log('\n');

        // Exit successfully
        process.exit(0);

    } catch (error) {
        console.log('\n');
        logger.error('='.repeat(60));
        logger.error('SCRIPT FAILED!');
        logger.error(`Error: ${error.message}`);
        logger.error('='.repeat(60));
        console.log('\n');

        // Exit with error code
        process.exit(1);
    }
}

// ==================== SCRIPT EXECUTION ====================

// Check if running directly
if (require.main === module) {
    main();
}

module.exports = { main };
