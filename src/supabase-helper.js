/**
 * Supabase Helper
 * Provides utilities for fetching member data from Supabase
 */

const https = require('https');

// Supabase configuration from environment or hardcoded
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dnoceszgtfqapxzjoawh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub2Nlc3pndGZxYXB4empvYXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTU2ODMsImV4cCI6MjA3NzQ3MTY4M30.BEyY6pehM-zmGrX45NCOFnXbuwYprf6xPiTdcfXmJlA';

// Current month table
const CURRENT_MONTH_TABLE = process.env.CURRENT_MONTH_TABLE || 'february_2026';

/**
 * Make HTTPS request helper
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(reqOptions, (res) => {
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
 * Get all members from Supabase for the current month
 * @returns {Promise<Array>} Array of member objects
 */
async function getAllMembers() {
    try {
        console.log(`📊 Fetching all members from ${CURRENT_MONTH_TABLE} table...`);

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
        console.log(`✅ Fetched ${members.length} members from database`);

        return members;

    } catch (error) {
        console.error(`❌ Failed to get members: ${error.message}`);
        throw error;
    }
}

/**
 * Get all customers from the total_users table (excludes admins)
 * @returns {Promise<Array>} Array of total user objects
 */
async function getTotalUsers() {
  try {
    console.log('📊 Fetching all customers from total_users table...');

    const url = `${SUPABASE_URL}/rest/v1/total_users?select=id,full_name,mobile_number,role&neq(role,admin)`;

    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch total users: HTTP ${response.status}`);
    }

    const users = response.data;
    console.log(`✅ Fetched ${users.length} total users`);

    return users;
  } catch (error) {
    console.error(`❌ Failed to get total users: ${error.message}`);
    throw error;
  }
}

/**
 * Format phone number for WhatsApp
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Add 91 prefix if needed
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
}

module.exports = {
    getAllMembers,
  getTotalUsers,
    formatPhoneNumber,
    CURRENT_MONTH_TABLE
};
