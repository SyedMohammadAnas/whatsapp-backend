/**
 * WhatsApp Backend API Testing Script
 * Tests all endpoints of the WhatsApp backend service
 * Run with: node test-api.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_NUMBER = '+1234567890'; // Replace with actual test number
const TEST_MESSAGE = 'Hello from WhatsApp Backend API Test!';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Helper function to make HTTP requests with error handling
 */
async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      timeout: 10000
    };

    if (data) {
      config.data = data;
      config.headers = {
        'Content-Type': 'application/json'
      };
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Test runner function
 */
async function runTests() {
  console.log(`${colors.cyan}🧪 Starting WhatsApp Backend API Tests${colors.reset}\n`);

  const tests = [
    {
      name: 'Server Health Check',
      method: 'GET',
      url: '/health'
    },
    {
      name: 'Root API Information',
      method: 'GET',
      url: '/'
    },
    {
      name: 'WhatsApp Service Health',
      method: 'GET',
      url: '/api/whatsapp/health'
    },
    {
      name: 'WhatsApp Status',
      method: 'GET',
      url: '/api/whatsapp/status'
    },
    {
      name: 'Get QR Code',
      method: 'GET',
      url: '/api/whatsapp/qr'
    },
    {
      name: 'Send Test Message',
      method: 'POST',
      url: '/api/whatsapp/send',
      data: {
        number: TEST_NUMBER,
        message: TEST_MESSAGE
      }
    },
    {
      name: 'Invalid Route Test',
      method: 'GET',
      url: '/api/invalid-route'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`${colors.blue}📋 Testing: ${test.name}${colors.reset}`);
    console.log(`   ${test.method} ${test.url}`);

    const result = await makeRequest(test.method, test.url, test.data);

    if (result.success && result.status < 400) {
      console.log(`   ${colors.green}✅ PASSED (${result.status})${colors.reset}`);

      // Show additional info for specific endpoints
      if (test.url === '/api/whatsapp/status' || test.url === '/api/whatsapp/qr') {
        console.log(`   ${colors.yellow}📄 Response:${colors.reset}`, JSON.stringify(result.data, null, 2));
      }

      passed++;
    } else {
      console.log(`   ${colors.red}❌ FAILED (${result.status})${colors.reset}`);
      console.log(`   ${colors.red}Error:${colors.reset}`, result.error);
      failed++;
    }

    console.log(''); // Empty line for readability

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test summary
  console.log(`${colors.cyan}📊 Test Summary${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`${colors.magenta}📈 Total: ${passed + failed}${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Check the backend service.${colors.reset}`);
  }
}

/**
 * Interactive QR Code Display
 * Continuously polls for QR code and displays it
 */
async function watchQrCode() {
  console.log(`${colors.cyan}👀 Watching for QR Code...${colors.reset}`);
  console.log(`${colors.yellow}Press Ctrl+C to stop${colors.reset}\n`);

  const interval = setInterval(async () => {
    const result = await makeRequest('GET', '/api/whatsapp/qr');

    if (result.success && result.data.success && result.data.data.qrCode) {
      console.log(`${colors.green}🔍 QR Code Available!${colors.reset}`);
      console.log(`${colors.cyan}Open this URL in your browser to see the QR code:${colors.reset}`);
      console.log(`data:image/png;base64,${result.data.data.qrCode.split(',')[1]}`);
      console.log('\n' + '='.repeat(80) + '\n');
    } else if (result.success && result.data.data?.isReady) {
      console.log(`${colors.green}✅ WhatsApp is connected and ready!${colors.reset}`);
      clearInterval(interval);
    } else {
      console.log(`${colors.yellow}⏳ Waiting for QR code... (${result.data?.data?.status || 'unknown'})${colors.reset}`);
    }
  }, 3000);
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--qr') || args.includes('-q')) {
    watchQrCode();
  } else {
    runTests().catch(error => {
      console.error(`${colors.red}🚨 Test execution failed:${colors.reset}`, error);
      process.exit(1);
    });
  }
}

module.exports = { makeRequest, runTests, watchQrCode };
