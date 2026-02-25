/**
 * Error Handler - Unit Tests
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../config/index.js', () => ({ config: { env: 'test' } }));
vi.mock('../../infrastructure/services/appLogger.js', () => ({ appLogger: { error: vi.fn(), info: vi.fn() } }));

import { AppError, badRequest, unauthorized, forbidden, notFound, conflict, errorHandler } from '../errorHandler.js';

describe('AppError', () => {
    it('should create error with status code', () => {
        const err = new AppError(400, 'BAD', 'Bad');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('BAD');
        expect(err.name).toBe('AppError');
    });
});

describe('Error factories', () => {
    it('badRequest → 400', () => { expect(badRequest('x').statusCode).toBe(400); });
    it('unauthorized → 401', () => { expect(unauthorized('x').statusCode).toBe(401); });
    it('forbidden → 403', () => { expect(forbidden('x').statusCode).toBe(403); });
    it('notFound → 404', () => { expect(notFound('x').statusCode).toBe(404); });
    it('conflict → 409', () => { expect(conflict('x').statusCode).toBe(409); });
});

describe('errorHandler', () => {
    const mockRes = () => { const r: any = {}; r.status = vi.fn().mockReturnValue(r); r.json = vi.fn().mockReturnValue(r); return r; };

    it('should handle AppError', () => {
        const res = mockRes();
        errorHandler(new AppError(422, 'UNP', 'Bad'), {} as any, res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'UNP' }) }));
    });

    it('should handle generic Error with 500', () => {
        const res = mockRes();
        errorHandler(new Error('oops'), {} as any, res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
