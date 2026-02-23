/**
 * Users Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/index.js', () => ({ config: {}, prisma: {} }));
vi.mock('../repository.js', () => ({
    userRepository: { findUserCompany: vi.fn() },
}));
vi.mock('../../../shared/middleware/index.js', () => ({ invalidateUserCache: vi.fn() }));
vi.mock('bcrypt', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() } }));

import { userRepository } from '../repository.js';
import { isPlatformAdmin, canManageCompany } from '../service.js';

describe('isPlatformAdmin', () => {
    it('true for PLATFORM_ADMIN', () => {
        expect(isPlatformAdmin({ id: '1', globalRole: 'PLATFORM_ADMIN' as any, stores: [], companies: [] })).toBe(true);
    });
    it('false for null globalRole', () => {
        expect(isPlatformAdmin({ id: '1', globalRole: null, stores: [], companies: [] })).toBe(false);
    });
});

describe('canManageCompany', () => {
    beforeEach(() => vi.clearAllMocks());

    it('true for PLATFORM_ADMIN', async () => {
        expect(await canManageCompany({ id: '1', globalRole: 'PLATFORM_ADMIN' as any, stores: [], companies: [] }, 'c1')).toBe(true);
    });

    it('true for COMPANY_ADMIN', async () => {
        (userRepository.findUserCompany as any).mockResolvedValue({ role: 'COMPANY_ADMIN' });
        expect(await canManageCompany({ id: '1', globalRole: null, stores: [], companies: [] }, 'c1')).toBe(true);
    });

    it('false for regular user', async () => {
        (userRepository.findUserCompany as any).mockResolvedValue({ role: 'COMPANY_USER' });
        expect(await canManageCompany({ id: '1', globalRole: null, stores: [], companies: [] }, 'c1')).toBe(false);
    });
});
