#!/usr/bin/env node

/**
 * SETUP VERIFICATION SCRIPT
 *
 * This script verifies that everything is ready for the video forwarding operation.
 * Run this BEFORE running the main forward-video-script.js
 *
 * Usage:
 * node test-forward-setup.js
 */

const https = require('https');
const http = require('http');

// ==================== CONFIGURATION ====================

const SOURCE_NUMBER = '917396926840';
const WHATSAPP_API_BASE = 'http://localhost:3001';
const SUPABASE_URL = 'https://dnoceszgtfqapxzjoawh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub2Nlc3pndGZxYXB4empvYXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTU2ODMsImV4cCI6MjA3NzQ3MTY4M30.BEyY6pehM-zmGrX45NCOFnXbuwYprf6xPiTdcfXmJlA';
const CURRENT_MONTH_TABLE = 'february_2026';

// ==================== HELPER FUNCTIONS ====================

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

const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`[PASS] ${msg}`),
    error: (msg) => console.error(`[FAIL] ${msg}`),
    warning: (msg) => console.warn(`[WARN] ${msg}`)
};

// ==================== TEST FUNCTIONS ====================

/**
 * Test 1: Check WhatsApp Backend Connection
 */
async function testWhatsAppConnection() {
    try {
        logger.info('Test 1: Checking WhatsApp backend connection...');

        const response = await makeRequest(`${WHATSAPP_API_BASE}/health`);

        if (response.status === 200) {
            logger.success('WhatsApp backend is accessible');
            return true;
        } else {
            logger.error(`WhatsApp backend returned status ${response.status}`);
            return false;
        }
    } catch (error) {
        logger.error(`Cannot connect to WhatsApp backend: ${error.message}`);
        logger.error('Make sure the backend is running: cd whatsapp-backend && npm start');
        return false;
    }
}

/**
 * Test 2: Check WhatsApp Ready Status
 */
async function testWhatsAppReady() {
    try {
        logger.info('Test 2: Checking WhatsApp authentication status...');

        const response = await makeRequest(`${WHATSAPP_API_BASE}/api/whatsapp/status`);

        if (response.status === 200 && response.data.success) {
            const isReady = response.data.data.isReady;
            const status = response.data.data.connectionStatus;

            if (isReady) {
                logger.success(`WhatsApp is ready (Status: ${status})`);
                return true;
            } else {
                logger.error(`WhatsApp is NOT ready (Status: ${status})`);
                logger.error('Please authenticate WhatsApp by scanning the QR code');
                return false;
            }
        } else {
            logger.error('Failed to check WhatsApp status');
            return false;
        }
    } catch (error) {
        logger.error(`Error checking WhatsApp status: ${error.message}`);
        return false;
    }
}

/**
 * Test 3: Check if messages endpoint works
 */
async function testMessagesEndpoint() {
    try {
        logger.info('Test 3: Testing messages endpoint...');

        const response = await makeRequest(
            `${WHATSAPP_API_BASE}/api/whatsapp/messages/${SOURCE_NUMBER}?limit=5`
        );

        if (response.status === 200 && response.data.success) {
            const count = response.data.data.count;
            logger.success(`Messages endpoint works (Retrieved ${count} messages)`);
            return true;
        } else {
            logger.error('Messages endpoint failed');
            return false;
        }
    } catch (error) {
        logger.error(`Error testing messages endpoint: ${error.message}`);
        return false;
    }
}

/**
 * Test 4: Check for video message
 */
async function testVideoMessageExists() {
    try {
        logger.info('Test 4: Checking for video message from source...');

        const response = await makeRequest(
            `${WHATSAPP_API_BASE}/api/whatsapp/messages/${SOURCE_NUMBER}?limit=20`
        );

        if (response.status === 200 && response.data.success) {
            const messages = response.data.data.messages;
            const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
            const latestMediaMessage = sortedMessages.find(msg => msg.hasMedia);

            if (latestMediaMessage) {
                logger.success(`Found media message (ID: ${latestMediaMessage.id.substring(0, 20)}...)`);
                logger.info(`Media timestamp: ${new Date(latestMediaMessage.timestamp * 1000).toLocaleString()}`);
                return true;
            } else {
                logger.error('No media message found in the latest 20 messages');
                logger.warning("Make sure you've sent +91 7396926840 a media message");
                return false;
            }
        } else {
            logger.error('Failed to check for media message');
            return false;
        }
    } catch (error) {
        logger.error(`Error checking video message: ${error.message}`);
        return false;
    }
}

/**
 * Test 5: Check Supabase connection
 */
async function testSupabaseConnection() {
    try {
        logger.info('Test 5: Testing Supabase connection...');

        const url = `${SUPABASE_URL}/rest/v1/${CURRENT_MONTH_TABLE}?select=count`;

        const response = await makeRequest(url, {
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.status === 200 || response.status === 206) {
            logger.success('Supabase connection successful');
            return true;
        } else {
            logger.error(`Supabase returned status ${response.status}`);
            return false;
        }
    } catch (error) {
        logger.error(`Cannot connect to Supabase: ${error.message}`);
        return false;
    }
}

/**
 * Test 6: Count members in database
 */
async function testMemberCount() {
    try {
        logger.info('Test 6: Counting members in database...');

        const url = `${SUPABASE_URL}/rest/v1/${CURRENT_MONTH_TABLE}?select=id,full_name,mobile_number`;

        const response = await makeRequest(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            const members = response.data;
            logger.success(`Found ${members.length} members in ${CURRENT_MONTH_TABLE} table`);

            if (members.length === 0) {
                logger.warning('No members found! Cannot forward to zero members');
                return false;
            }

            return true;
        } else {
            logger.error('Failed to count members');
            return false;
        }
    } catch (error) {
        logger.error(`Error counting members: ${error.message}`);
        return false;
    }
}

// ==================== MAIN FUNCTION ====================

async function main() {
    console.log('\n');
    logger.info('='.repeat(60));
    logger.info('SETUP VERIFICATION SCRIPT');
    logger.info('='.repeat(60));
    console.log('\n');

    const tests = [
        { name: 'WhatsApp Backend Connection', func: testWhatsAppConnection },
        { name: 'WhatsApp Authentication', func: testWhatsAppReady },
        { name: 'Messages Endpoint', func: testMessagesEndpoint },
        { name: 'Video Message Availability', func: testVideoMessageExists },
        { name: 'Supabase Connection', func: testSupabaseConnection },
        { name: 'Member Count', func: testMemberCount }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = await test.func();
        if (result) {
            passed++;
        } else {
            failed++;
        }
        console.log('\n');
    }

    logger.info('='.repeat(60));
    logger.info(`RESULTS: ${passed} passed, ${failed} failed`);
    logger.info('='.repeat(60));
    console.log('\n');

    if (failed === 0) {
        logger.success('ALL TESTS PASSED!');
        logger.success('You are ready to run the forwarding script:');
        logger.success('  node forward-video-script.js');
    } else {
        logger.error(`${failed} test(s) failed`);
        logger.error('Please fix the issues before running the forwarding script');
    }

    console.log('\n');
    process.exit(failed === 0 ? 0 : 1);
}

// ==================== EXECUTION ====================

if (require.main === module) {
    main();
}

module.exports = { main };
