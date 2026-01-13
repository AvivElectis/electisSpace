/**
 * MSW Handlers for SoluM API
 * 
 * Mock Service Worker handlers for testing SoluM API integration.
 * These handlers simulate real SoluM API responses without making network requests.
 */

import { http, HttpResponse } from 'msw';

// ==================== Mock Data ====================

export const mockTokens = {
    access_token: 'mock-access-token-12345',
    refresh_token: 'mock-refresh-token-67890',
    expires_in: 10800, // 3 hours
};

export const mockArticles = [
    {
        articleId: '101',
        data: {
            ITEM_NAME: 'Room 101',
            ENGLISH_NAME: 'Room 101',
            RANK: 'Captain',
            TITLE: 'Manager',
        },
    },
    {
        articleId: '102',
        data: {
            ITEM_NAME: 'Room 102',
            ENGLISH_NAME: 'Room 102',
            RANK: 'Lieutenant',
            TITLE: 'Assistant',
        },
    },
];

export const mockLabels = [
    {
        labelCode: 'LBL001',
        articleId: '101',
        status: 'ACTIVE',
        battery: 90,
    },
    {
        labelCode: 'LBL002',
        articleId: '102',
        status: 'ACTIVE',
        battery: 85,
    },
];

export const mockStoreInfo = {
    storeCode: '001',
    storeName: 'Test Store',
    timezone: 'Asia/Jerusalem',
};

// ==================== API Base URL Pattern ====================

const BASE_URL = 'https://eu.common.solumesl.com';
const API_PATH = '/common/api/v2';

// ==================== Handlers ====================

export const handlers = [
    // ==================== Authentication ====================

    /**
     * POST /common/api/v2/token - Login
     */
    http.post(`${BASE_URL}${API_PATH}/token`, async ({ request }) => {
        const body = await request.json() as { username: string; password: string };

        // Simulate authentication failure
        if (body.username === 'invalid' || body.password === 'wrong') {
            return HttpResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        return HttpResponse.json({
            responseMessage: mockTokens,
            responseCode: '200',
        });
    }),

    /**
     * POST /common/api/v2/token/refresh - Refresh Token
     */
    http.post(`${BASE_URL}${API_PATH}/token/refresh`, async ({ request }) => {
        const body = await request.json() as { refreshToken: string };

        // Simulate invalid refresh token
        if (body.refreshToken === 'invalid-token') {
            return HttpResponse.json(
                { error: 'Invalid refresh token' },
                { status: 401 }
            );
        }

        return HttpResponse.json({
            responseMessage: {
                ...mockTokens,
                access_token: 'new-access-token-' + Date.now(),
            },
            responseCode: '200',
        });
    }),

    // ==================== Articles ====================

    /**
     * GET /common/api/v2/common/config/article/info - Fetch Articles
     */
    http.get(`${BASE_URL}${API_PATH}/common/config/article/info`, ({ request }) => {
        const url = new URL(request.url);
        const company = url.searchParams.get('company');
        // Note: store param available in url.searchParams if needed
        const page = parseInt(url.searchParams.get('page') || '0');
        const size = parseInt(url.searchParams.get('size') || '100');

        // Simulate company not found
        if (company === 'notfound') {
            return HttpResponse.json(
                { error: 'Company not found' },
                { status: 404 }
            );
        }

        // Pagination simulation
        const startIndex = page * size;
        const paginatedArticles = mockArticles.slice(startIndex, startIndex + size);

        return HttpResponse.json({
            totalArticleCnt: mockArticles.length,
            articleList: paginatedArticles,
            responseCode: '200',
        });
    }),

    /**
     * POST /common/api/v2/common/articles - Push Articles (Full Replace)
     */
    http.post(`${BASE_URL}${API_PATH}/common/articles`, async ({ request }) => {
        void new URL(request.url); // validate URL
        const articles = await request.json() as any[];

        // Validate articles
        if (!Array.isArray(articles)) {
            return HttpResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            responseMessage: `${articles.length} articles updated`,
            responseCode: '200',
        });
    }),

    /**
     * PUT /common/api/v2/common/articles - Update Articles (Partial)
     */
    http.put(`${BASE_URL}${API_PATH}/common/articles`, async ({ request }) => {
        const articles = await request.json() as any[];

        return HttpResponse.json({
            responseMessage: `${articles.length} articles updated`,
            responseCode: '200',
        });
    }),

    /**
     * DELETE /common/api/v2/common/articles - Delete Articles
     */
    http.delete(`${BASE_URL}${API_PATH}/common/articles`, async ({ request }) => {
        const body = await request.json() as { articleDeleteList: string[] };

        return HttpResponse.json({
            responseMessage: `${body.articleDeleteList.length} articles deleted`,
            responseCode: '200',
        });
    }),

    /**
     * GET /common/api/v2/common/config/articleField - Fetch Article Details
     */
    http.get(`${BASE_URL}${API_PATH}/common/config/articleField`, ({ request }) => {
        const url = new URL(request.url);
        const articleId = url.searchParams.get('article');

        const article = mockArticles.find(a => a.articleId === articleId);

        if (!article) {
            return new HttpResponse(null, { status: 204 });
        }

        return HttpResponse.json({
            ...article,
            responseCode: '200',
        });
    }),

    // ==================== Labels ====================

    /**
     * GET /common/api/v2/common/labels - Fetch Labels
     */
    http.get(`${BASE_URL}${API_PATH}/common/labels`, () => {
        return HttpResponse.json({
            labelList: mockLabels,
            responseCode: '200',
        });
    }),

    /**
     * POST /common/api/v2/common/labels/link - Link Label to Article
     */
    http.post(`${BASE_URL}${API_PATH}/common/labels/link`, async ({ request }) => {
        const body = await request.json() as { labelCode: string; articleId: string };

        return HttpResponse.json({
            responseMessage: `Label ${body.labelCode} linked to article ${body.articleId}`,
            responseCode: '200',
        });
    }),

    // ==================== Store ====================

    /**
     * GET /common/api/v2/common/store - Fetch Store Info
     */
    http.get(`${BASE_URL}${API_PATH}/common/store`, () => {
        return HttpResponse.json({
            ...mockStoreInfo,
            responseCode: '200',
        });
    }),
];

// ==================== C1 Cluster Handlers ====================

export const c1Handlers = handlers.map(handler => {
    // Create copies for C1 cluster URLs (with /c1 prefix)
    const original = handler as any;
    if (original.info?.path) {
        const c1Path = original.info.path.replace(BASE_URL, `${BASE_URL}/c1`);
        return http[original.info.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](
            c1Path,
            original.resolver
        );
    }
    return handler;
});

// Combined handlers for both clusters
export const allHandlers = [...handlers, ...c1Handlers];
