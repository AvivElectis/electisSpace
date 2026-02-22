import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../../config/index.js';
import { appLogger } from '../infrastructure/services/appLogger.js';

// Custom error class
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}

// Error response interface
interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
        stack?: string;
    };
}

// Error handler middleware
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    appLogger.error('ErrorHandler', err.message, { stack: err.stack });

    const response: ErrorResponse = {
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
    };

    let statusCode = 500;

    // Handle AppError
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        response.error.code = err.code;
        response.error.message = err.message;
        if (err.details) {
            response.error.details = err.details;
        }
    } else if (err instanceof ZodError) {
        // Handle Zod validation errors
        statusCode = 400;
        response.error.code = 'VALIDATION_ERROR';
        response.error.message = 'Invalid input data';
        response.error.details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
    } else if (err.name === 'JsonWebTokenError') {
        // Handle JWT errors
        statusCode = 401;
        response.error.code = 'INVALID_TOKEN';
        response.error.message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        response.error.code = 'TOKEN_EXPIRED';
        response.error.message = 'Authentication token has expired';
    }

    // Include stack trace in development
    if (config.isDev) {
        response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

// Helper functions for common errors
export const badRequest = (message: string, details?: unknown): AppError =>
    new AppError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'Unauthorized'): AppError =>
    new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'Forbidden'): AppError =>
    new AppError(403, 'FORBIDDEN', message);

export const notFound = (resource = 'Resource'): AppError =>
    new AppError(404, 'NOT_FOUND', `${resource} not found`);

export const conflict = (message: string): AppError =>
    new AppError(409, 'CONFLICT', message);

export const unprocessable = (message: string, details?: unknown): AppError =>
    new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);

export const tooManyRequests = (message = 'Too many requests'): AppError =>
    new AppError(429, 'RATE_LIMITED', message);

export const serviceUnavailable = (message = 'Service unavailable'): AppError =>
    new AppError(503, 'SERVICE_UNAVAILABLE', message);
