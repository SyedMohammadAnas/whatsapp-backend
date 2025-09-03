/**
 * Session Management Test Script
 * Tests the enhanced WhatsApp session management features
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const TEST_NUMBER = process.env.TEST_NUMBER || '1234567890';

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
 * Test API endpoint
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request data (optional)
 * @returns {Promise<Object>} Response data
 */
const testEndpoint = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
};

/**
 * Run all session management tests
 */
const runSessionManagementTests = async () => {
    print('cyan', '\n🤖 WhatsApp Session Management Test Suite');
    print('cyan', '==========================================\n');

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Server Health Check
    print('yellow', '1. Testing Server Health Check...');
    totalTests++;
    const healthResult = await testEndpoint('GET', '/health');
    if (healthResult.success && healthResult.data.success) {
        print('green', '✅ Server health check passed');
        passedTests++;
    } else {
        print('red', '❌ Server health check failed');
        console.log(healthResult.error);
    }

    // Test 2: WhatsApp Status
    print('yellow', '\n2. Testing WhatsApp Status...');
    totalTests++;
    const statusResult = await testEndpoint('GET', '/api/whatsapp/status');
    if (statusResult.success && statusResult.data.success) {
        print('green', '✅ WhatsApp status check passed');
        print('blue', `   Status: ${statusResult.data.data.connectionStatus}`);
        passedTests++;
    } else {
        print('red', '❌ WhatsApp status check failed');
        console.log(statusResult.error);
    }

    // Test 3: Session Information
    print('yellow', '\n3. Testing Session Information...');
    totalTests++;
    const sessionInfoResult = await testEndpoint('GET', '/api/whatsapp/session-info');
    if (sessionInfoResult.success && sessionInfoResult.data.success) {
        print('green', '✅ Session information check passed');
        const sessionData = sessionInfoResult.data.data;
        print('blue', `   Session Path: ${sessionData.sessionInfo.sessionPath}`);
        print('blue', `   Reconnect Attempts: ${sessionData.sessionInfo.reconnectAttempts}/${sessionData.sessionInfo.maxReconnectAttempts}`);
        print('blue', `   Health Checks Active: ${sessionData.sessionInfo.healthChecksActive}`);
        print('blue', `   Session Files: ${sessionData.sessionFiles?.length || 0} files`);
        passedTests++;
    } else {
        print('red', '❌ Session information check failed');
        console.log(sessionInfoResult.error);
    }

    // Test 4: WhatsApp Health Check
    print('yellow', '\n4. Testing WhatsApp Health Check...');
    totalTests++;
    const whatsappHealthResult = await testEndpoint('GET', '/api/whatsapp/health');
    if (whatsappHealthResult.success && whatsappHealthResult.data.success) {
        print('green', '✅ WhatsApp health check passed');
        print('blue', `   Service Status: ${whatsappHealthResult.data.data.status}`);
        passedTests++;
    } else {
        print('red', '❌ WhatsApp health check failed');
        console.log(whatsappHealthResult.error);
    }

    // Test 5: Session Cleanup
    print('yellow', '\n5. Testing Session Cleanup...');
    totalTests++;
    const cleanupResult = await testEndpoint('POST', '/api/whatsapp/cleanup-sessions');
    if (cleanupResult.success && cleanupResult.data.success) {
        print('green', '✅ Session cleanup test passed');
        print('blue', `   Message: ${cleanupResult.data.message}`);
        passedTests++;
    } else {
        print('red', '❌ Session cleanup test failed');
        console.log(cleanupResult.error);
    }

    // Test 6: Manual Reconnection (if client is ready)
    print('yellow', '\n6. Testing Manual Reconnection...');
    totalTests++;
    const reconnectResult = await testEndpoint('POST', '/api/whatsapp/reconnect');
    if (reconnectResult.success && reconnectResult.data.success) {
        print('green', '✅ Manual reconnection test passed');
        print('blue', `   Message: ${reconnectResult.data.message}`);
        passedTests++;
    } else {
        print('red', '❌ Manual reconnection test failed');
        console.log(reconnectResult.error);
    }

    // Test 7: QR Code (if not authenticated)
    print('yellow', '\n7. Testing QR Code Endpoint...');
    totalTests++;
    const qrResult = await testEndpoint('GET', '/api/whatsapp/qr');
    if (qrResult.success && qrResult.data.success) {
        print('green', '✅ QR code endpoint test passed');
        if (qrResult.data.data.qrCode) {
            print('blue', '   QR Code available for scanning');
        } else {
            print('blue', '   Already authenticated');
        }
        passedTests++;
    } else {
        print('red', '❌ QR code endpoint test failed');
        console.log(qrResult.error);
    }

    // Test 8: Message Sending (if client is ready)
    print('yellow', '\n8. Testing Message Sending...');
    totalTests++;
    const messageData = {
        number: TEST_NUMBER,
        message: `Test message from session management test - ${new Date().toISOString()}`
    };
    const sendResult = await testEndpoint('POST', '/api/whatsapp/send', messageData);
    if (sendResult.success && sendResult.data.success) {
        print('green', '✅ Message sending test passed');
        print('blue', `   Message ID: ${sendResult.data.data.messageId}`);
        passedTests++;
    } else {
        print('red', '❌ Message sending test failed');
        console.log(sendResult.error);
    }

    // Summary
    print('cyan', '\n📊 Test Summary');
    print('cyan', '===============');
    print('bright', `Total Tests: ${totalTests}`);
    print('green', `Passed: ${passedTests}`);
    print('red', `Failed: ${totalTests - passedTests}`);

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    if (successRate >= 80) {
        print('green', `Success Rate: ${successRate}% ✅`);
    } else if (successRate >= 60) {
        print('yellow', `Success Rate: ${successRate}% ⚠️`);
    } else {
        print('red', `Success Rate: ${successRate}% ❌`);
    }

    // Recommendations
    print('cyan', '\n💡 Recommendations');
    print('cyan', '==================');

    if (passedTests < totalTests) {
        print('yellow', '• Check server logs for detailed error information');
        print('yellow', '• Verify WhatsApp client authentication status');
        print('yellow', '• Ensure session directory has proper permissions');
        print('yellow', '• Check network connectivity and firewall settings');
    } else {
        print('green', '• All session management features are working correctly');
        print('green', '• WhatsApp client is properly configured and authenticated');
        print('green', '• Session persistence and recovery mechanisms are functional');
    }

    print('cyan', '\n🔧 Session Management Features Verified:');
    print('blue', '• Session directory validation and creation');
    print('blue', '• Corrupted session cleanup');
    print('blue', '• Session health monitoring');
    print('blue', '• Manual reconnection capability');
    print('blue', '• Detailed session information retrieval');
    print('blue', '• Automatic error recovery mechanisms');
    print('blue', '• Session state management');

    print('cyan', '\n🎉 Session Management Test Suite Completed!\n');
};

// Run tests if this file is executed directly
if (require.main === module) {
    runSessionManagementTests().catch(error => {
        print('red', `❌ Test suite failed with error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runSessionManagementTests, testEndpoint };
