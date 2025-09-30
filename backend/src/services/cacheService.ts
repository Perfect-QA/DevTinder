import { TestCase } from '../types';

interface CacheEntry {
  testCases: TestCase[];
  timestamp: number;
  userId: string;
  sessionId: string;
}

class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cache entries
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Generate cache key for user session
   */
  private generateCacheKey(userId: string, sessionId: string): string {
    return `${userId}_${sessionId}`;
  }

  /**
   * Save test cases to cache
   */
  saveTestCases(userId: string, sessionId: string, testCases: TestCase[]): void {
    try {
      const cacheKey = this.generateCacheKey(userId, sessionId);
      const cacheEntry: CacheEntry = {
        testCases: testCases.slice(-10), // Keep only last 10 test cases
        timestamp: Date.now(),
        userId,
        sessionId
      };

      this.cache.set(cacheKey, cacheEntry);
      this.cleanupExpiredEntries();
      this.enforceMaxCacheSize();

      console.log(`💾 Cached ${testCases.length} test cases for user ${userId}`);
    } catch (error) {
      console.error('Failed to save test cases to cache:', error);
    }
  }

  /**
   * Load test cases from cache
   */
  loadTestCases(userId: string, sessionId: string): TestCase[] {
    try {
      const cacheKey = this.generateCacheKey(userId, sessionId);
      const cacheEntry = this.cache.get(cacheKey);

      if (!cacheEntry) {
        return [];
      }

      // Check if cache is expired
      const isExpired = Date.now() - cacheEntry.timestamp > this.CACHE_EXPIRY;
      if (isExpired) {
        this.cache.delete(cacheKey);
        return [];
      }

      console.log(`📂 Loaded ${cacheEntry.testCases.length} cached test cases for user ${userId}`);
      return cacheEntry.testCases;
    } catch (error) {
      console.error('Failed to load test cases from cache:', error);
      return [];
    }
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string, sessionId?: string): void {
    try {
      if (sessionId) {
        // Clear specific session
        const cacheKey = this.generateCacheKey(userId, sessionId);
        this.cache.delete(cacheKey);
        console.log(`🗑️ Cleared cache for user ${userId}, session ${sessionId}`);
      } else {
        // Clear all sessions for user
        const keysToDelete = Array.from(this.cache.keys()).filter(key => 
          key.startsWith(`${userId}_`)
        );
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cleared all cache for user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to clear user cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; totalSize: number; expiredEntries: number } {
    const now = Date.now();
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY) {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      totalSize: this.cache.size,
      expiredEntries
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Enforce maximum cache size
   */
  private enforceMaxCacheSize(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
    entriesToRemove.forEach(([key]) => this.cache.delete(key));
    
    console.log(`🧹 Removed ${entriesToRemove.length} old cache entries to maintain size limit`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log('🗑️ Cleared all cache');
  }
}

export default new CacheService();

