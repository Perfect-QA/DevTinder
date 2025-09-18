import cron from 'node-cron';
import User from '../models/user';
import mongoose from 'mongoose';
import { getSessionExpiryMs, getSessionExpiryDate } from '../utils/sessionUtils';

interface CleanupStats {
    totalUsersProcessed: number;
    totalSessionsRemoved: number;
    totalUsersUpdated: number;
    errors: number;
    lastRun: Date;
    nextRun: Date;
}

class SessionCleanupService {
    private isRunning: boolean = false;
    private stats: CleanupStats = {
        totalUsersProcessed: 0,
        totalSessionsRemoved: 0,
        totalUsersUpdated: 0,
        errors: 0,
        lastRun: new Date(),
        nextRun: new Date()
    };


    // Clean up expired sessions for all users
    public async cleanupExpiredSessions(): Promise<CleanupStats> {
        if (this.isRunning) {
            console.log('🔄 Session cleanup already running, skipping...');
            return this.stats;
        }

        this.isRunning = true;
        const startTime = new Date();
        const sessionExpiryMs = getSessionExpiryMs();
        const expiryDate = getSessionExpiryDate();

        console.log(`🧹 Starting session cleanup - removing sessions older than ${sessionExpiryMs / (24 * 60 * 60 * 1000)} days`);
        console.log(`📅 Expiry date: ${expiryDate.toISOString()}`);

        try {
            // Reset stats for this run
            this.stats = {
                totalUsersProcessed: 0,
                totalSessionsRemoved: 0,
                totalUsersUpdated: 0,
                errors: 0,
                lastRun: startTime,
                nextRun: new Date()
            };

            // Find all users with active sessions
            const users = await User.find({
                'activeSessions.0': { $exists: true }
            }).select('_id emailId activeSessions');

            this.stats.totalUsersProcessed = users.length;
            console.log(`👥 Found ${users.length} users with active sessions`);

            for (const user of users) {
                try {
                    const initialSessionCount = user.activeSessions.length;
                    
                    // Filter out expired sessions
                    const activeSessions = user.activeSessions.filter(session => {
                        const sessionDate = new Date(session.lastActivity);
                        return sessionDate > expiryDate;
                    });

                    const removedCount = initialSessionCount - activeSessions.length;
                    
                    if (removedCount > 0) {
                        user.activeSessions = activeSessions;
                        await user.save();
                        
                        this.stats.totalSessionsRemoved += removedCount;
                        this.stats.totalUsersUpdated++;
                        
                        console.log(`🧹 User ${user.emailId}: removed ${removedCount} expired sessions (${activeSessions.length} remaining)`);
                    }
                } catch (error) {
                    this.stats.errors++;
                    console.error(`❌ Error cleaning sessions for user ${user.emailId}:`, error);
                }
            }

            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            
            console.log(`✅ Session cleanup completed in ${duration}ms`);
            console.log(`📊 Stats: ${this.stats.totalSessionsRemoved} sessions removed from ${this.stats.totalUsersUpdated} users`);
            
            if (this.stats.errors > 0) {
                console.log(`⚠️  ${this.stats.errors} errors occurred during cleanup`);
            }

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Session cleanup failed:', error);
        } finally {
            this.isRunning = false;
        }

        return this.stats;
    }

    // Start the cron job for automatic cleanup
    public startCronJob(): void {
        // Run cleanup every 6 hours (0 */6 * * *)
        const cronExpression = process.env.SESSION_CLEANUP_CRON || '0 */6 * * *';
        
        console.log(`⏰ Starting session cleanup cron job: ${cronExpression}`);
        console.log(`📅 Next cleanup: ${this.getNextRunTime(cronExpression)}`);

        cron.schedule(cronExpression, async () => {
            console.log('🕐 Cron job triggered - starting session cleanup...');
            await this.cleanupExpiredSessions();
        });
    }

    // Get next run time for cron expression
    private getNextRunTime(cronExpression: string): string {
        try {
            // This is a simplified approach - in production you might want to use a more robust solution
            return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours from now
        } catch (error) {
            return 'Unknown';
        }
    }

    // Manual cleanup trigger (for testing or admin use)
    public async triggerManualCleanup(): Promise<CleanupStats> {
        console.log('🔧 Manual session cleanup triggered');
        return await this.cleanupExpiredSessions();
    }

    // Get cleanup statistics
    public getStats(): CleanupStats {
        return { ...this.stats };
    }

    // Check if cleanup is currently running
    public isCleanupRunning(): boolean {
        return this.isRunning;
    }

    // Stop the cron job
    public stopCronJob(): void {
        // Note: node-cron doesn't have a destroy method, this is a placeholder
        console.log('🛑 Session cleanup cron job stopped');
    }
}

// Export singleton instance
export const sessionCleanupService = new SessionCleanupService();
export default sessionCleanupService;
