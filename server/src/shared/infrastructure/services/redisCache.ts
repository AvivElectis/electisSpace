/**
 * Redis Cache Service
 *
 * Thin wrapper around ioredis for caching frequently accessed data.
 * Falls back gracefully if Redis is unavailable (returns null on get, no-op on set).
 */

import { getRedisClient } from '../../../config/index.js';

const CACHE_PREFIX = 'cache:';

/**
 * Get a cached value by key. Returns null on miss or Redis error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedisClient();
        const raw = await redis.get(CACHE_PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Set a cached value with TTL (in seconds). No-op on Redis error.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.set(CACHE_PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
        // Fail silently — cache is best-effort
    }
}

/**
 * Invalidate a cached key. No-op on Redis error.
 */
export async function cacheInvalidate(key: string): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.del(CACHE_PREFIX + key);
    } catch {
        // Fail silently
    }
}

/**
 * Invalidate all keys matching a pattern (e.g. "company-settings:*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
    try {
        const redis = getRedisClient();
        const fullPattern = CACHE_PREFIX + pattern;
        let cursor = '0';
        do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
            cursor = newCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== '0');
    } catch {
        // Fail silently
    }
}
