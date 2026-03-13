import Redis from 'ioredis';
import { config } from './env.js';
import { appLogger } from '../shared/infrastructure/services/appLogger.js';

// Redis client singleton
let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
    if (!redis) {
        redis = new Redis(config.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    appLogger.error('Redis', 'Connection failed after 3 retries');
                    return null;
                }
                return Math.min(times * 200, 2000);
            },
        });

        redis.on('connect', () => {
            appLogger.info('Redis', 'Connected');
        });

        redis.on('error', (err) => {
            appLogger.error('Redis', `Error: ${err.message}`);
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
