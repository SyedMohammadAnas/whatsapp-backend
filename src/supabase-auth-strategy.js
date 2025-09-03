/**
 * Custom Authentication Strategy for WhatsApp Web.js
 * Supports both local file storage and Supabase session storage
 * Automatically switches based on environment (development vs production)
 */

const { LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const {
    ensureSessionsTable,
    storeSession,
    retrieveSession,
    updateSession,
    deleteSession
} = require('./supabase');

// Add debug logging
const debug = (message) => {
    console.log(`🔧 [SupabaseAuth] ${message}`);
};

/**
 * Custom authentication strategy that extends LocalAuth for Supabase support
 */
class SupabaseAuthStrategy extends LocalAuth {
    constructor(options = {}) {
        this.clientId = options.clientId || process.env.CLIENT_ID || 'default-client';
        this.dataPath = options.dataPath || process.env.SESSION_PATH || './whatsapp-session';
        this.useSupabase = process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true';

        debug(`Initializing with clientId: ${this.clientId}`);
        debug(`Environment: ${process.env.NODE_ENV}`);
        debug(`Use Supabase: ${this.useSupabase}`);

        // Call parent constructor
        super(options);

        if (this.useSupabase) {
            debug('Using SupabaseAuth strategy for production');
            this.ensureSupabaseTable();
        } else {
            debug('Using LocalAuth strategy for development');
        }
    }

    /**
     * Ensure Supabase table exists
     */
    async ensureSupabaseTable() {
        try {
            await ensureSessionsTable();
        } catch (error) {
            console.error('❌ Failed to ensure Supabase table:', error);
            // Fallback to local storage if Supabase fails
            this.useSupabase = false;
            this.localAuth = new LocalAuth({
                clientId: this.clientId,
                dataPath: this.dataPath
            });
            console.log('🔄 Falling back to LocalAuth due to Supabase error');
        }
    }

    /**
     * Get session file path for local storage
     */
    getSessionFilePath() {
        return path.join(this.dataPath, `${this.clientId}.json`);
    }

    /**
 * Override setSession to save to Supabase in production
 */
async setSession(sessionData) {
    debug(`setSession called for client: ${this.clientId}`);

    // Always call parent setSession for local storage
    await super.setSession(sessionData);

    // Additionally save to Supabase in production
    if (this.useSupabase) {
        try {
            debug(`Storing session in Supabase: ${this.clientId}`);
            const result = await storeSession(this.clientId, sessionData);

            if (result.success) {
                debug('Session stored in Supabase');
            } else {
                debug(`Failed to store session in Supabase: ${result.error}`);
            }
        } catch (error) {
            debug(`Error storing session in Supabase: ${error.message}`);
        }
    }
}

/**
 * Override getSession to retrieve from Supabase in production
 */
async getSession() {
    debug(`getSession called for client: ${this.clientId}`);

    if (this.useSupabase) {
        try {
            debug(`Retrieving session from Supabase: ${this.clientId}`);
            const result = await retrieveSession(this.clientId);

            if (result.success) {
                debug('Session retrieved from Supabase');
                // Also save to local storage for compatibility
                await super.setSession(result.data);
                return result.data;
            } else {
                debug('No session found in Supabase, trying local storage');
            }
        } catch (error) {
            debug(`Error retrieving session from Supabase: ${error.message}`);
        }
    }

    // Fallback to local storage
    return super.getSession();
}

    /**
 * Override deleteSession to also delete from Supabase in production
 */
async deleteSession() {
    debug(`deleteSession called for client: ${this.clientId}`);

    // Always call parent deleteSession for local storage
    await super.deleteSession();

    // Additionally delete from Supabase in production
    if (this.useSupabase) {
        try {
            debug(`Deleting session from Supabase: ${this.clientId}`);
            const result = await deleteSession(this.clientId);

            if (result.success) {
                debug('Session deleted from Supabase');
            } else {
                debug(`Failed to delete session from Supabase: ${result.error}`);
            }
        } catch (error) {
            debug(`Error deleting session from Supabase: ${error.message}`);
        }
    }
}

    /**
     * Get session info for debugging
     */
    async getSessionInfo() {
        if (!this.useSupabase) {
            // Return local session info
            const sessionPath = this.getSessionFilePath();
            return {
                storageType: 'local',
                clientId: this.clientId,
                sessionPath: sessionPath,
                exists: fs.existsSync(sessionPath),
                size: fs.existsSync(sessionPath) ? fs.statSync(sessionPath).size : 0
            };
        }

        try {
            const result = await retrieveSession(this.clientId);
            return {
                storageType: 'supabase',
                clientId: this.clientId,
                exists: result.success,
                data: result.success ? result.data : null
            };
        } catch (error) {
            return {
                storageType: 'supabase',
                clientId: this.clientId,
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Migrate session from local to Supabase
     */
    async migrateToSupabase() {
        if (this.useSupabase) {
            console.log('ℹ️ Already using Supabase storage');
            return { success: true, message: 'Already using Supabase' };
        }

        try {
            const sessionPath = this.getSessionFilePath();

            if (!fs.existsSync(sessionPath)) {
                return { success: false, message: 'No local session to migrate' };
            }

            console.log('🔄 Migrating session from local to Supabase...');

            // Read local session data
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

            // Store in Supabase
            const result = await storeSession(this.clientId, sessionData);

            if (result.success) {
                console.log('✅ Session migrated to Supabase successfully');
                return { success: true, message: 'Session migrated successfully' };
            } else {
                console.error('❌ Failed to migrate session to Supabase');
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('❌ Error migrating session:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Migrate session from Supabase to local
     */
    async migrateToLocal() {
        if (!this.useSupabase) {
            console.log('ℹ️ Already using local storage');
            return { success: true, message: 'Already using local storage' };
        }

        try {
            console.log('🔄 Migrating session from Supabase to local...');

            // Retrieve from Supabase
            const result = await retrieveSession(this.clientId);

            if (!result.success) {
                return { success: false, message: 'No Supabase session to migrate' };
            }

            // Ensure local directory exists
            if (!fs.existsSync(this.dataPath)) {
                fs.mkdirSync(this.dataPath, { recursive: true });
            }

            // Write to local file
            const sessionPath = this.getSessionFilePath();
            fs.writeFileSync(sessionPath, JSON.stringify(result.data, null, 2));

            console.log('✅ Session migrated to local storage successfully');
            return { success: true, message: 'Session migrated successfully' };
        } catch (error) {
            console.error('❌ Error migrating session:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = SupabaseAuthStrategy;
