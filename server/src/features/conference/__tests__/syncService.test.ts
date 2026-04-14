import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFindMany = vi.fn();
const mockFindByExternalId = vi.fn();
const mockSyncCreate = vi.fn();
const mockSyncUpdate = vi.fn();

vi.mock('../../../config/index.js', () => ({
    prisma: {
        syncQueueItem: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    },
}));

vi.mock('../repository.js', () => ({
    conferenceRepository: {
        findByExternalId: (...args: unknown[]) => mockFindByExternalId(...args),
        syncCreate: (...args: unknown[]) => mockSyncCreate(...args),
        syncUpdate: (...args: unknown[]) => mockSyncUpdate(...args),
    },
}));

vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { conferenceSyncService } from '../syncService.js';

beforeEach(() => {
    mockFindMany.mockReset();
    mockFindByExternalId.mockReset();
    mockSyncCreate.mockReset();
    mockSyncUpdate.mockReset();
    mockFindMany.mockResolvedValue([]);
});

describe('conferenceSyncService.upsertManyFromArticles', () => {
    it('strips the C prefix and creates when no existing row', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockSyncCreate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Boardroom' } }],
            'store-1',
        );

        expect(mockFindByExternalId).toHaveBeenCalledWith('store-1', '101');
        expect(mockSyncCreate).toHaveBeenCalledWith(
            expect.objectContaining({ storeId: 'store-1', externalId: '101' }),
        );
        expect(result).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
    });

    it('updates when existing row has different data', async () => {
        mockFindByExternalId.mockResolvedValue({ id: 'conf-1', roomName: 'Old', hasMeeting: false });
        mockSyncUpdate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'New' } }],
            'store-1',
        );

        expect(mockSyncUpdate).toHaveBeenCalledWith('conf-1', { roomName: 'New' });
        expect(result.updated).toBe(1);
    });

    it('reports unchanged when existing row has identical data', async () => {
        mockFindByExternalId.mockResolvedValue({ id: 'conf-1', roomName: 'Same', hasMeeting: false });

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Same' } }],
            'store-1',
        );

        expect(mockSyncUpdate).not.toHaveBeenCalled();
        expect(mockSyncCreate).not.toHaveBeenCalled();
        expect(result.unchanged).toBe(1);
    });

    it('skips articles whose externalId has a non-terminal delete in the queue', async () => {
        mockFindMany.mockResolvedValue([
            { payload: { externalId: 'C101' } },
        ]);

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Boardroom' } }],
            'store-1',
        );

        expect(mockFindByExternalId).not.toHaveBeenCalled();
        expect(mockSyncCreate).not.toHaveBeenCalled();
        expect(result).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 1 });
    });

    it('skips an article with missing or single-char articleId', async () => {
        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C' }, { articleId: undefined }],
            'store-1',
        );
        expect(result.skipped).toBe(2);
        expect(mockSyncCreate).not.toHaveBeenCalled();
    });

    it('unescapes articleName when it carries CSV-style double quotes', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockSyncCreate.mockResolvedValue({});
        await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', articleName: '"Room""A"', data: {} }],
            'store-1',
        );
        expect(mockSyncCreate).toHaveBeenCalledWith(
            expect.objectContaining({ roomName: 'Room"A' }),
        );
    });

    it('unescapes CSV-style double-quoted strings in name field', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockSyncCreate.mockResolvedValue({});

        await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: '"ד""ר"' } }],
            'store-1',
        );

        // The article has data.name → extracted as roomName, with CSV-double-quotes unescaped.
        expect(mockSyncCreate).toHaveBeenCalledWith(
            expect.objectContaining({ roomName: 'ד"ר' }),
        );
    });

    it('continues past a per-article failure and counts it as skipped', async () => {
        mockFindByExternalId
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce(null);
        mockSyncCreate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [
                { articleId: 'C101', data: { name: 'A' } },
                { articleId: 'C102', data: { name: 'B' } },
            ],
            'store-1',
        );
        expect(result.skipped).toBe(1);
        expect(result.created).toBe(1);
    });
});
