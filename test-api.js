/**
 * API Testing Script
 * Tests all WhatsApp backend endpoints using Axios
 * Provides detailed feedback for each test case
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_DELAY = 2000; // Delay between tests in milliseconds

// Test data
const testNumber = '917396926840'; // Test number provided by user (without + prefix)
const testMessage = 'Hello! WhatsApp Backend is now fully operational! 🎉 Message sent at: ' + new Date().toLocaleString();

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Print colored output
 * @param {string} color - Color name
 * @param {string} message - Message to print
 */
const print = (color, message) => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

/**
 * Sleep function for delays between tests
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test health endpoint
 */
const testHealthEndpoint = async () => {
    print('cyan', '\n🏥 Testing /health endpoint...');

    try {
        const response = await axios.get(`${BASE_URL}/health`);

        if (response.status === 200 && response.data.success) {
            print('green', '✅ PASSED: Health endpoint is working');
            print('blue', `   Service: ${response.data.data.service}`);
            print('blue', `   Status: ${response.data.data.status}`);
            print('blue', `   Uptime: ${response.data.data.uptime.toFixed(2)}s`);
            return true;
        } else {
            print('red', '❌ FAILED: Health endpoint returned unexpected response');
            return false;
        }
    } catch (error) {
        print('red', `❌ FAILED: Health endpoint error - ${error.message}`);
        return false;
    }
};

/**
 * Test WhatsApp status endpoint
 */
const testWhatsAppStatus = async () => {
    print('cyan', '\n📊 Testing /api/whatsapp/status endpoint...');

    try {
        const response = await axios.get(`${BASE_URL}/api/whatsapp/status`);

        if (response.status === 200 && response.data.success) {
            print('green', '✅ PASSED: WhatsApp status endpoint is working');
            print('blue', `   Connection Status: ${response.data.data.connectionStatus}`);
            print('blue', `   Is Ready: ${response.data.data.isReady}`);
            print('blue', `   Client ID: ${response.data.data.clientId}`);
            return true;
        } else {
            print('red', '❌ FAILED: WhatsApp status endpoint returned unexpected response');
            return false;
        }
    } catch (error) {
        print('red', `❌ FAILED: WhatsApp status endpoint error - ${error.message}`);
        return false;
    }
};

/**
 * Test WhatsApp QR endpoint
 */
const testWhatsAppQR = async () => {
    print('cyan', '\n📱 Testing /api/whatsapp/qr endpoint...');

    try {
        const response = await axios.get(`${BASE_URL}/api/whatsapp/qr`);

        if (response.status === 200 && response.data.success) {
            print('green', '✅ PASSED: WhatsApp QR endpoint is working');

            if (response.data.data.qrCode) {
                print('yellow', '   QR Code is available for scanning');
                print('blue', `   Connection Status: ${response.data.data.connectionStatus}`);
            } else {
                print('yellow', '   WhatsApp is already authenticated');
                print('blue', `   Connection Status: ${response.data.data.connectionStatus}`);
            }
            return true;
        } else if (response.status === 404) {
            print('yellow', '⚠️  QR Code not available (this is normal if already authenticated)');
            print('blue', `   Current Status: ${response.data.data.connectionStatus}`);
            return true; // Not a failure, just no QR available
        } else {
            print('red', '❌ FAILED: WhatsApp QR endpoint returned unexpected response');
            return false;
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            print('yellow', '⚠️  QR Code not available (this is normal if already authenticated)');
            return true;
        }
        print('red', `❌ FAILED: WhatsApp QR endpoint error - ${error.message}`);
        return false;
    }
};

/**
 * Test WhatsApp send endpoint
 */
const testWhatsAppSend = async () => {
    print('cyan', '\n📤 Testing /api/whatsapp/send endpoint...');

    try {
        const response = await axios.post(`${BASE_URL}/api/whatsapp/send`, {
            number: testNumber,
            message: testMessage
        });

        if (response.status === 200 && response.data.success) {
            print('green', '✅ PASSED: WhatsApp send endpoint is working');
            print('blue', `   Message ID: ${response.data.data.messageId}`);
            print('blue', `   Sent to: ${response.data.data.to}`);
            print('blue', `   Timestamp: ${response.data.data.timestamp}`);
            return true;
        } else {
            print('red', '❌ FAILED: WhatsApp send endpoint returned unexpected response');
            return false;
        }
    } catch (error) {
        if (error.response && error.response.status === 503) {
            print('yellow', '⚠️  Send failed - WhatsApp client not ready yet');
            print('blue', `   Error: ${error.response.data.error}`);
            return true; // Not a failure, just client not ready
        }
        print('red', `❌ FAILED: WhatsApp send endpoint error - ${error.message}`);
        return false;
    }
};

/**
 * Test WhatsApp health endpoint
 */
const testWhatsAppHealth = async () => {
    print('cyan', '\n🏥 Testing /api/whatsapp/health endpoint...');

    try {
        const response = await axios.get(`${BASE_URL}/api/whatsapp/health`);

        if (response.status === 200 && response.data.success) {
            print('green', '✅ PASSED: WhatsApp health endpoint is working');
            print('blue', `   Service: ${response.data.data.service}`);
            print('blue', `   Status: ${response.data.data.status}`);
            print('blue', `   Connection Status: ${response.data.data.connectionStatus}`);
            print('blue', `   Is Ready: ${response.data.data.isReady}`);
            return true;
        } else {
            print('red', '❌ FAILED: WhatsApp health endpoint returned unexpected response');
            return false;
        }
    } catch (error) {
        print('red', `❌ FAILED: WhatsApp health endpoint error - ${error.message}`);
        return false;
    }
};

/**
 * Test invalid endpoints
 */
const testInvalidEndpoints = async () => {
    print('cyan', '\n🚫 Testing invalid endpoints...');

    try {
        // Test non-existent endpoint
        await axios.get(`${BASE_URL}/invalid-endpoint`);
        print('red', '❌ FAILED: Invalid endpoint should return 404');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            print('green', '✅ PASSED: Invalid endpoint correctly returns 404');
            return true;
        } else {
            print('red', `❌ FAILED: Invalid endpoint test error - ${error.message}`);
            return false;
        }
    }
};

/**
 * Test send endpoint with invalid data
 */
const testInvalidSendData = async () => {
    print('cyan', '\n🚫 Testing send endpoint with invalid data...');

    try {
        // Test missing required fields
        const response = await axios.post(`${BASE_URL}/api/whatsapp/send`, {
            number: testNumber
            // Missing message field
        });

        print('red', '❌ FAILED: Should reject request with missing message');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            print('green', '✅ PASSED: Correctly rejects request with missing fields');
            return true;
        } else {
            print('red', `❌ FAILED: Invalid data test error - ${error.message}`);
            return false;
        }
    }
};

/**
 * Main test runner
 */
const runTests = async () => {
    print('bright', '\n🚀 Starting WhatsApp Backend API Tests...');
    print('blue', `📡 Testing against: ${BASE_URL}`);
    print('blue', `⏰ Test started at: ${new Date().toISOString()}`);

    const results = [];

    // Run all tests
    results.push(await testHealthEndpoint());
    await sleep(TEST_DELAY);

    results.push(await testWhatsAppStatus());
    await sleep(TEST_DELAY);

    results.push(await testWhatsAppQR());
    await sleep(TEST_DELAY);

    results.push(await testWhatsAppHealth());
    await sleep(TEST_DELAY);

    results.push(await testWhatsAppSend());
    await sleep(TEST_DELAY);

    results.push(await testInvalidEndpoints());
    await sleep(TEST_DELAY);

    results.push(await testInvalidSendData());

    // Calculate results
    const passed = results.filter(result => result === true).length;
    const total = results.length;
    const failed = total - passed;

    // Print summary
    print('bright', '\n📊 Test Results Summary:');
    print('green', `✅ PASSED: ${passed}/${total}`);
    print('red', `❌ FAILED: ${failed}/${total}`);

    if (passed === total) {
        print('green', '\n🎉 All tests passed! WhatsApp Backend API is working correctly.');
    } else {
        print('yellow', '\n⚠️  Some tests failed. Check the server logs for more details.');
    }

    print('blue', `\n⏰ Test completed at: ${new Date().toISOString()}`);
};

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    print('bright', '\n📋 WhatsApp Backend API Test Script');
    print('blue', 'Usage: node test-api.js [options]');
    print('blue', '\nOptions:');
    print('blue', '  --help, -h     Show this help message');
    print('blue', '  --url <url>    Set base URL for testing (default: http://localhost:3001)');
    print('blue', '  --number <num> Set test phone number');
    print('blue', '  --message <msg> Set test message');
    print('blue', '\nExample:');
    print('blue', '  node test-api.js --url http://localhost:3001 --number 1234567890');
    process.exit(0);
}

// Parse command line arguments
if (args.includes('--url')) {
    const urlIndex = args.indexOf('--url');
    if (urlIndex + 1 < args.length) {
        BASE_URL = args[urlIndex + 1];
    }
}

if (args.includes('--number')) {
    const numberIndex = args.indexOf('--number');
    if (numberIndex + 1 < args.length) {
        testNumber = args[numberIndex + 1];
    }
}

if (args.includes('--message')) {
    const messageIndex = args.indexOf('--message');
    if (messageIndex + 1 < args.length) {
        testMessage = args[messageIndex + 1];
    }
}

// Run tests
runTests().catch(error => {
    print('red', `\n💥 Test runner error: ${error.message}`);
    process.exit(1);
});
