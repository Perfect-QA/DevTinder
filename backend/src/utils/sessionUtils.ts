/**
 * Utility functions for session management
 */

/**
 * Get session expiry time in milliseconds from environment variables
 * @returns {number} Session expiry time in milliseconds
 * @throws {Error} If no valid session expiry environment variable is set
 */
export function getSessionExpiryMs(): number {
    // First try SESSION_EXPIRY_TIME (direct milliseconds)
    const envExpiryTime = process.env.SESSION_EXPIRY_TIME;
    if (envExpiryTime && !isNaN(Number(envExpiryTime))) {
        return Number(envExpiryTime);
    }
    
    // Fallback to SESSION_EXPIRY_DAYS (days converted to milliseconds)
    const envExpiryDays = process.env.SESSION_EXPIRY_DAYS;
    if (envExpiryDays && !isNaN(Number(envExpiryDays))) {
        return Number(envExpiryDays) * 24 * 60 * 60 * 1000;
    }
    
    // If no environment variable is set, throw an error
    throw new Error('SESSION_EXPIRY_TIME or SESSION_EXPIRY_DAYS must be set in environment variables');
}

/**
 * Get session expiry date (current time minus expiry duration)
 * @returns {Date} The date before which sessions are considered expired
 */
export function getSessionExpiryDate(): Date {
    const sessionExpiryMs = getSessionExpiryMs();
    return new Date(Date.now() - sessionExpiryMs);
}

/**
 * Check if a session is expired based on its last activity
 * @param {Date} lastActivity - The last activity date of the session
 * @returns {boolean} True if the session is expired
 */
export function isSessionExpired(lastActivity: Date): boolean {
    const expiryDate = getSessionExpiryDate();
    return new Date(lastActivity) <= expiryDate;
}
