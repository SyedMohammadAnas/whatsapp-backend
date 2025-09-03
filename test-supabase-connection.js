/**
 * Test Supabase Connection and Session Storage
 * Run this script to verify that Supabase is properly configured
 */

require('dotenv').config();
const {
    supabase,
    ensureSessionsTable,
    storeSession,
    retrieveSession,
    deleteSession
} = require('./src/supabase');

async function testSupabaseConnection() {
    console.log('🧪 Testing Supabase connection...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

    try {
        // Test 1: Check if table exists
        console.log('\n📋 Test 1: Checking sessions table...');
        const tableExists = await ensureSessionsTable();
        console.log('Table exists:', tableExists);

        if (!tableExists) {
            console.log('❌ Sessions table not found. Please run the migration first.');
            return;
        }

        // Test 2: Store a test session
        console.log('\n💾 Test 2: Storing test session...');
        const testClientId = 'test-client-' + Date.now();
        const testSessionData = {
            test: true,
            timestamp: new Date().toISOString(),
            clientId: testClientId
        };

        const storeResult = await storeSession(testClientId, testSessionData);
        console.log('Store result:', storeResult.success ? '✅ Success' : '❌ Failed');
        if (!storeResult.success) {
            console.log('Error:', storeResult.error);
        }

        // Test 3: Retrieve the test session
        console.log('\n📥 Test 3: Retrieving test session...');
        const retrieveResult = await retrieveSession(testClientId);
        console.log('Retrieve result:', retrieveResult.success ? '✅ Success' : '❌ Failed');
        if (retrieveResult.success) {
            console.log('Retrieved data:', JSON.stringify(retrieveResult.data, null, 2));
        } else {
            console.log('Error:', retrieveResult.error);
        }

        // Test 4: Delete the test session
        console.log('\n🗑️ Test 4: Deleting test session...');
        const deleteResult = await deleteSession(testClientId);
        console.log('Delete result:', deleteResult.success ? '✅ Success' : '❌ Failed');
        if (!deleteResult.success) {
            console.log('Error:', deleteResult.error);
        }

        console.log('\n🎉 Supabase connection test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testSupabaseConnection();
