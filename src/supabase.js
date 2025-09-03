/**
 * Supabase Configuration for WhatsApp Backend
 * Handles session storage in Supabase for production deployments
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables for session storage');
    console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client instance for session management
 * Uses service role key for full database access
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * WhatsApp Sessions Table Schema
 * This table stores WhatsApp session data for persistence across deployments
 *
 * Table: whatsapp_sessions
 * Columns:
 * - id: uuid (primary key)
 * - client_id: text (unique identifier for the client)
 * - session_data: jsonb (serialized session data)
 * - created_at: timestamp with time zone
 * - updated_at: timestamp with time zone
 * - is_active: boolean (indicates if session is currently active)
 */

/**
 * Create WhatsApp sessions table if it doesn't exist
 * @returns {Promise<boolean>} True if table exists or was created successfully
 */
const ensureSessionsTable = async () => {
    try {
        // Check if table exists by trying to query it
        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('id')
            .limit(1);

        if (error) {
            // Table doesn't exist, we need to create it
            console.log('📋 WhatsApp sessions table does not exist, creating...');

            // Note: In Supabase, you typically create tables through migrations
            // For now, we'll assume the table exists or handle the error gracefully
            console.warn('⚠️ Table creation requires manual setup in Supabase dashboard');
            console.warn('⚠️ Please create the whatsapp_sessions table manually');
            return false;
        }

        console.log('✅ WhatsApp sessions table exists');
        return true;
    } catch (error) {
        console.error('❌ Error ensuring sessions table:', error);
        return false;
    }
};

/**
 * Store session data in Supabase
 * @param {string} clientId - Unique client identifier
 * @param {Object} sessionData - Session data to store
 * @returns {Promise<Object>} Result object with success status
 */
const storeSession = async (clientId, sessionData) => {
    try {
        console.log(`💾 Storing session for client: ${clientId}`);

        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .upsert({
                client_id: clientId,
                session_data: sessionData,
                updated_at: new Date().toISOString(),
                is_active: true
            }, {
                onConflict: 'client_id'
            });

        if (error) {
            console.error('❌ Error storing session:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log('✅ Session stored successfully in Supabase');
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('❌ Error storing session:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Retrieve session data from Supabase
 * @param {string} clientId - Unique client identifier
 * @returns {Promise<Object>} Result object with session data
 */
const retrieveSession = async (clientId) => {
    try {
        console.log(`📥 Retrieving session for client: ${clientId}`);

        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('*')
            .eq('client_id', clientId)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No session found
                console.log(`ℹ️ No active session found for client: ${clientId}`);
                return {
                    success: false,
                    error: 'Session not found'
                };
            }
            console.error('❌ Error retrieving session:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log('✅ Session retrieved successfully from Supabase');
        return {
            success: true,
            data: data.session_data
        };
    } catch (error) {
        console.error('❌ Error retrieving session:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Update session data in Supabase
 * @param {string} clientId - Unique client identifier
 * @param {Object} sessionData - Updated session data
 * @returns {Promise<Object>} Result object with success status
 */
const updateSession = async (clientId, sessionData) => {
    try {
        console.log(`🔄 Updating session for client: ${clientId}`);

        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .update({
                session_data: sessionData,
                updated_at: new Date().toISOString()
            })
            .eq('client_id', clientId)
            .eq('is_active', true);

        if (error) {
            console.error('❌ Error updating session:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log('✅ Session updated successfully in Supabase');
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('❌ Error updating session:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete session data from Supabase
 * @param {string} clientId - Unique client identifier
 * @returns {Promise<Object>} Result object with success status
 */
const deleteSession = async (clientId) => {
    try {
        console.log(`🗑️ Deleting session for client: ${clientId}`);

        const { error } = await supabase
            .from('whatsapp_sessions')
            .delete()
            .eq('client_id', clientId);

        if (error) {
            console.error('❌ Error deleting session:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log('✅ Session deleted successfully from Supabase');
        return {
            success: true
        };
    } catch (error) {
        console.error('❌ Error deleting session:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Mark session as inactive (soft delete)
 * @param {string} clientId - Unique client identifier
 * @returns {Promise<Object>} Result object with success status
 */
const deactivateSession = async (clientId) => {
    try {
        console.log(`🔒 Deactivating session for client: ${clientId}`);

        const { error } = await supabase
            .from('whatsapp_sessions')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('client_id', clientId);

        if (error) {
            console.error('❌ Error deactivating session:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log('✅ Session deactivated successfully in Supabase');
        return {
            success: true
        };
    } catch (error) {
        console.error('❌ Error deactivating session:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get all active sessions
 * @returns {Promise<Object>} Result object with all active sessions
 */
const getAllActiveSessions = async () => {
    try {
        console.log('📋 Retrieving all active sessions');

        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .select('*')
            .eq('is_active', true)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('❌ Error retrieving active sessions:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log(`✅ Retrieved ${data.length} active sessions from Supabase`);
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('❌ Error retrieving active sessions:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Clean up old inactive sessions
 * @param {number} daysOld - Number of days old to consider for cleanup
 * @returns {Promise<Object>} Result object with cleanup status
 */
const cleanupOldSessions = async (daysOld = 30) => {
    try {
        console.log(`🧹 Cleaning up sessions older than ${daysOld} days`);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { data, error } = await supabase
            .from('whatsapp_sessions')
            .delete()
            .lt('updated_at', cutoffDate.toISOString())
            .eq('is_active', false);

        if (error) {
            console.error('❌ Error cleaning up old sessions:', error);
            return {
                success: false,
                error: error.message
            };
        }

        console.log('✅ Old sessions cleaned up successfully from Supabase');
        return {
            success: true,
            deletedCount: data?.length || 0
        };
    } catch (error) {
        console.error('❌ Error cleaning up old sessions:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Export functions
module.exports = {
    supabase,
    ensureSessionsTable,
    storeSession,
    retrieveSession,
    updateSession,
    deleteSession,
    deactivateSession,
    getAllActiveSessions,
    cleanupOldSessions
};
