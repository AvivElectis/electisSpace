import Redis from 'ioredis';
import { config } from './env.js';

// Redis client singleton
let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
    if (!redis) {
        redis = new Redis(config.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.error('Redis connection failed after 3 retries');
                    return null;
                }
                return Math.min(times * 200, 2000);
            },
        });

        redis.on('connect', () => {
            console.log('✅ Redis connected');
        });

        redis.on('error', (err) => {
            console.error('❌ Redis error:', err.message);
        });
    }

    return redis;
};

// Close Redis connection
export const closeRedis = async (): Promise<void> => {
    if (redis) {
        await redis.quit();
        redis = null;
    }
};

export default getRedisClient;
