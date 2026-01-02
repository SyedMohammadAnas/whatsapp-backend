#!/usr/bin/env node

/**
 * WhatsApp Backend Auto-Restart Monitor
 * Monitors the WhatsApp backend process and automatically restarts it when it terminates
 * due to connectivity issues or other failures
 */

const { spawn } = require('child_process');
const path = require('path');

class AutoRestartMonitor {
    constructor() {
        this.process = null;
        this.restartCount = 0;
        this.maxRestarts = 10; // Maximum restarts within time window
        this.restartWindow = 5 * 60 * 1000; // 5 minutes window
        this.restartTimestamps = [];
        this.isShuttingDown = false;

        // Handle graceful shutdown
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());

        console.log('🔄 WhatsApp Backend Auto-Restart Monitor started');
        console.log(`📊 Max restarts: ${this.maxRestarts} within ${this.restartWindow / 1000}s window`);
    }

    /**
     * Check if we're within the restart rate limit
     */
    isWithinRateLimit() {
        const now = Date.now();
        // Remove timestamps outside the window
        this.restartTimestamps = this.restartTimestamps.filter(
            timestamp => now - timestamp < this.restartWindow
        );

        return this.restartTimestamps.length < this.maxRestarts;
    }

    /**
     * Start the WhatsApp backend process
     */
    startProcess() {
        if (this.isShuttingDown) return;

        console.log(`\n🚀 Starting WhatsApp backend (attempt ${this.restartCount + 1})`);

        // Use npm start to run the backend
        this.process = spawn('npm', ['start'], {
            cwd: path.dirname(__filename),
            stdio: 'inherit',
            shell: true
        });

        this.process.on('close', (code, signal) => {
            if (this.isShuttingDown) {
                console.log('🛑 Process terminated during shutdown');
                return;
            }

            console.log(`\n💥 WhatsApp backend exited with code: ${code}, signal: ${signal}`);

            // Only auto-restart if it was an error exit (not manual shutdown)
            if (code !== 0 && code !== null) {
                this.handleProcessExit();
            } else {
                console.log('✅ Process exited cleanly, not restarting');
            }
        });

        this.process.on('error', (error) => {
            console.error('❌ Failed to start process:', error.message);
            if (!this.isShuttingDown) {
                setTimeout(() => this.handleProcessExit(), 5000);
            }
        });
    }

    /**
     * Handle process exit and decide whether to restart
     */
    handleProcessExit() {
        if (this.isShuttingDown) return;

        this.restartCount++;
        this.restartTimestamps.push(Date.now());

        if (!this.isWithinRateLimit()) {
            console.error(`❌ Too many restarts (${this.restartCount}) within ${this.restartWindow / 1000}s. Stopping auto-restart.`);
            console.log('🔧 Please check your WhatsApp backend configuration and connectivity.');
            return;
        }

        console.log(`⏳ Waiting 10 seconds before restart... (${this.restartCount}/${this.maxRestarts})`);
        setTimeout(() => {
            this.startProcess();
        }, 10000);
    }

    /**
     * Graceful shutdown of the monitor
     */
    gracefulShutdown() {
        console.log('\n🛑 Auto-restart monitor shutting down...');
        this.isShuttingDown = true;

        if (this.process) {
            console.log('🔄 Terminating WhatsApp backend process...');
            this.process.kill('SIGTERM');

            // Give it 10 seconds to shut down gracefully
            setTimeout(() => {
                if (this.process) {
                    console.log('⚠️ Force killing WhatsApp backend process...');
                    this.process.kill('SIGKILL');
                }
                process.exit(0);
            }, 10000);
        } else {
            process.exit(0);
        }
    }

    /**
     * Start the monitoring process
     */
    start() {
        this.startProcess();
    }
}

// Start the monitor if this script is run directly
if (require.main === module) {
    const monitor = new AutoRestartMonitor();
    monitor.start();
}

module.exports = AutoRestartMonitor;
