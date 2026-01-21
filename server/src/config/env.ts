import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000').transform(Number),
    API_VERSION: z.string().default('v1'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Encryption
    ENCRYPTION_KEY: z.string().min(32),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:5173'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    // SoluM Defaults
    SOLUM_DEFAULT_API_URL: z.string().url().optional(),
    SOLUM_DEFAULT_CLUSTER: z.string().default('common'),

    // Admin
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
});

// Parse and validate environment
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
};

export const env = parseEnv();

// Derived configuration
export const config = {
    // Server
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    apiVersion: env.API_VERSION,

    // Database
    databaseUrl: env.DATABASE_URL,

    // Redis
    redisUrl: env.REDIS_URL,

    // JWT
    jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },

    // Encryption
    encryptionKey: env.ENCRYPTION_KEY,

    // CORS
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),

    // Rate Limiting
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX_REQUESTS,
    },

    // Logging
    logLevel: env.LOG_LEVEL,

    // SoluM
    solum: {
        defaultApiUrl: env.SOLUM_DEFAULT_API_URL,
        defaultCluster: env.SOLUM_DEFAULT_CLUSTER,
    },

    // Admin
    admin: {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
    },
} as const;

export type Config = typeof config;
