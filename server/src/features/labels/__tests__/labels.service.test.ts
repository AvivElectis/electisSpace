/**
 * Labels Service - Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../shared/infrastructure/services/aimsGateway.js', () => ({
    aimsGateway: {
        getStoreConfig: vi.fn(),
        fetchLabels: vi.fn(),
        fetchUnassignedLabels: vi.fn(),
        linkLabel: vi.fn(),
        unlinkLabel: vi.fn(),
        getToken: vi.fn(),
        blinkLabel: vi.fn(),
        getLabelImages: vi.fn(),
    },
}));

import { aimsGateway } from '../../../shared/infrastructure/services/aimsGateway.js';
import { labelsService } from '../service.js';

const ctx = { userId: 'u1', globalRole: null, storeIds: ['s1'] };
const adminCtx = { userId: 'a1', globalRole: 'PLATFORM_ADMIN', storeIds: [] };

describe('LabelsService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('list', () => {
        it('should throw FORBIDDEN for no store access', async () => {
            await expect(labelsService.list({ userId: 'u2', globalRole: null, storeIds: ['other'] }, 's1')).rejects.toBe('FORBIDDEN');
        });

        it('should throw AIMS_NOT_CONFIGURED', async () => {
            (aimsGateway.getStoreConfig as any).mockResolvedValue(null);
            await expect(labelsService.list(ctx, 's1')).rejects.toBe('AIMS_NOT_CONFIGURED');
        });

        it('should return merged labels', async () => {
            (aimsGateway.getStoreConfig as any).mockResolvedValue({ companyId: 'c1' });
            (aimsGateway.fetchLabels as any).mockResolvedValue([{ labelCode: 'L1', articleList: [{ articleId: 'A1' }], status: 'LINKED' }]);
            (aimsGateway.fetchUnassignedLabels as any).mockResolvedValue([{ labelCode: 'L2', signal: -50, battery: 90, status: 'UNLINKED' }]);

            const result = await labelsService.list(ctx, 's1');
            expect(result).toHaveProperty('labels');
            expect(result).toHaveProperty('total');
            expect(result.labels.length).toBeGreaterThanOrEqual(2);
        });

        it('should allow PLATFORM_ADMIN access to any store', async () => {
            (aimsGateway.getStoreConfig as any).mockResolvedValue({ companyId: 'c1' });
            (aimsGateway.fetchLabels as any).mockResolvedValue([]);
            (aimsGateway.fetchUnassignedLabels as any).mockResolvedValue([]);
            const result = await labelsService.list(adminCtx, 's1');
            expect(result).toHaveProperty('labels');
            expect(result.labels).toEqual([]);
        });

        it('should handle unassigned fetch failure gracefully', async () => {
            (aimsGateway.getStoreConfig as any).mockResolvedValue({ companyId: 'c1' });
            (aimsGateway.fetchLabels as any).mockResolvedValue([{ labelCode: 'L1', articleList: [], status: 'LINKED' }]);
            (aimsGateway.fetchUnassignedLabels as any).mockRejectedValue(new Error('fail'));
            const result = await labelsService.list(ctx, 's1');
            expect(result.labels).toHaveLength(1);
        });
    });
});
