import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFindMany = vi.fn();
const mockFindByExternalId = vi.fn();
const mockConferenceCreate = vi.fn();
const mockConferenceUpdate = vi.fn();

vi.mock('../../../config/index.js', () => ({
    prisma: {
        syncQueueItem: { findMany: (...args: unknown[]) => mockFindMany(...args) },
        conferenceRoom: {
            create: (...args: unknown[]) => mockConferenceCreate(...args),
            update: (...args: unknown[]) => mockConferenceUpdate(...args),
        },
    },
}));

vi.mock('../repository.js', () => ({
    conferenceRepository: {
        findByExternalId: (...args: unknown[]) => mockFindByExternalId(...args),
    },
}));

vi.mock('../../../shared/infrastructure/services/appLogger.js', () => ({
    appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { conferenceSyncService } from '../syncService.js';

const user = { id: 'user-1' };

beforeEach(() => {
    mockFindMany.mockReset();
    mockFindByExternalId.mockReset();
    mockConferenceCreate.mockReset();
    mockConferenceUpdate.mockReset();
    mockFindMany.mockResolvedValue([]);
});

describe('conferenceSyncService.upsertManyFromArticles', () => {
    it('strips the C prefix and creates when no existing row', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockConferenceCreate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Boardroom' } }],
            'store-1',
            user,
        );

        expect(mockFindByExternalId).toHaveBeenCalledWith('store-1', '101');
        expect(mockConferenceCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ storeId: 'store-1', externalId: '101' }),
            }),
        );
        expect(result).toEqual({ created: 1, updated: 0, unchanged: 0, skipped: 0 });
    });

    it('updates when existing row has different data', async () => {
        mockFindByExternalId.mockResolvedValue({ id: 'conf-1', roomName: 'Old', hasMeeting: false });
        mockConferenceUpdate.mockResolvedValue({});

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'New' } }],
            'store-1',
            user,
        );

        expect(mockConferenceUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'conf-1' } }),
        );
        expect(result.updated).toBe(1);
    });

    it('reports unchanged when existing row has identical data', async () => {
        mockFindByExternalId.mockResolvedValue({ id: 'conf-1', roomName: 'Same', hasMeeting: false });

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Same' } }],
            'store-1',
            user,
        );

        expect(mockConferenceUpdate).not.toHaveBeenCalled();
        expect(mockConferenceCreate).not.toHaveBeenCalled();
        expect(result.unchanged).toBe(1);
    });

    it('skips articles whose externalId has a non-terminal delete in the queue', async () => {
        mockFindMany.mockResolvedValue([
            { payload: { externalId: 'C101' } },
        ]);

        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: 'Boardroom' } }],
            'store-1',
            user,
        );

        expect(mockFindByExternalId).not.toHaveBeenCalled();
        expect(mockConferenceCreate).not.toHaveBeenCalled();
        expect(result).toEqual({ created: 0, updated: 0, unchanged: 0, skipped: 1 });
    });

    it('skips an article with missing or single-char articleId', async () => {
        const result = await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C' }, { articleId: undefined }],
            'store-1',
            user,
        );
        expect(result.skipped).toBe(2);
        expect(mockConferenceCreate).not.toHaveBeenCalled();
    });

    it('unescapes CSV-style double-quoted strings in name field', async () => {
        mockFindByExternalId.mockResolvedValue(null);
        mockConferenceCreate.mockResolvedValue({});

        await conferenceSyncService.upsertManyFromArticles(
            [{ articleId: 'C101', data: { name: '"ד""ר"' } }],
            'store-1',
            user,
        );

        // The article has data.name → extracted as roomName, with CSV-double-quotes unescaped.
        expect(mockConferenceCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ roomName: 'ד"ר' }),
            }),
        );
    });
});
