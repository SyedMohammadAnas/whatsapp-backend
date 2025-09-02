/**
 * WhatsApp Message Testing Script
 * Simple script to test message sending functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test phone number (replace with actual number for testing)
const TEST_PHONE = '917396926840'; // Your WhatsApp number from the logs

/**
 * Send a test message
 */
async function sendTestMessage(phoneNumber, message) {
  try {
    console.log(`📤 Sending message to: ${phoneNumber}`);
    console.log(`💬 Message: ${message}`);

    const response = await axios.post(`${BASE_URL}/api/whatsapp/send-message`, {
      phoneNumber: phoneNumber,
      message: message
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Response:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Get WhatsApp status
 */
async function getStatus() {
  try {
    console.log('📊 Getting WhatsApp status...');

    const response = await axios.get(`${BASE_URL}/api/whatsapp/status`);
    console.log('✅ Status:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Error getting status:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runMessageTests() {
  console.log('🧪 Starting WhatsApp Message Tests\n');

  // First, check status
  await getStatus();
  console.log('\n' + '='.repeat(50) + '\n');

  // Test messages
  const testMessages = [
    '🎉 Test Message 1: Backend rebuild successful!',
    '💻 Test Message 2: WhatsApp integration working perfectly',
    '🚀 Test Message 3: Ready for production use!'
  ];

  for (let i = 0; i < testMessages.length; i++) {
    console.log(`Test ${i + 1}/${testMessages.length}:`);
    await sendTestMessage(TEST_PHONE, testMessages[i]);
    console.log('\n' + '-'.repeat(30) + '\n');

    // Wait 2 seconds between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('🏁 Message tests completed!');
}

// Run tests if script is executed directly
if (require.main === module) {
  runMessageTests().catch(error => {
    console.error('🚨 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { sendTestMessage, getStatus, runMessageTests };
