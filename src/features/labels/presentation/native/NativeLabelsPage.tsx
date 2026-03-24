import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Fab, Switch, FormControlLabel } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LabelIcon from '@mui/icons-material/Label';

import { useLabelsStore } from '@features/labels/infrastructure/labelsStore';
import { useAuthStore } from '@features/auth/infrastructure/authStore';

import { NativePage } from '@shared/presentation/native/NativePage';
import { NativeLabelCard } from '@shared/presentation/native/NativeLabelCard';
import { NativeStatBar } from '@shared/presentation/native/NativeStatBar';
import { NativeSearchBar } from '@shared/presentation/native/NativeSearchBar';
import { NativeEmptyState } from '@shared/presentation/native/NativeEmptyState';
import { useSetNativeTitle } from '@shared/presentation/native/NativePageTitleContext';
import { nativeColors, nativeSpacing, nativeSizing } from '@shared/presentation/themes/nativeTokens';

import type { LabelArticleLink } from '@features/labels/domain/types';

const PAGE_SIZE = 25;

/**
 * NativeLabelsPage — Android-native Labels list.
 * Shows label cards with linked/unlinked status, thumbnails.
 * Mirrors data logic of LabelsPage.
 */
export function NativeLabelsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    useSetNativeTitle(t('navigation.labels'));

    const activeStoreId = useAuthStore((s) => s.activeStoreId);
    const isAppReady = useAuthStore((s) => s.isAppReady);

    const {
        labels,
        isLoading,
        error,
        filterLinkedOnly,
        fetchLabels,
        unlinkLabelFromArticle,
        setFilterLinkedOnly,
        setSearchQuery,
        searchQuery,
    } = useLabelsStore();

    // Fetch on mount / store switch
    useEffect(() => {
        if (isAppReady && activeStoreId) {
            fetchLabels(activeStoreId).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppReady, activeStoreId]);

    const [page, setPage] = useState(0);

    // Reset pagination when filter/search changes
    useEffect(() => {
        setPage(0);
    }, [searchQuery, filterLinkedOnly]);

    // Filtered labels (same logic as LabelsPage)
    const filteredLabels = useMemo(() => {
        let result = [...labels];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (l) =>
                    l.labelCode.toLowerCase().includes(q) ||
                    l.articleId.toLowerCase().includes(q) ||
                    l.articleName?.toLowerCase().includes(q)
            );
        }
        if (filterLinkedOnly) {
            result = result.filter((l) => !!l.articleId);
        }
        return result;
    }, [labels, searchQuery, filterLinkedOnly]);

    // Paginated labels
    const paginatedLabels = useMemo(() => {
        const start = page * PAGE_SIZE;
        return filteredLabels.slice(start, start + PAGE_SIZE);
    }, [filteredLabels, page]);

    // Stats
    const linkedCount = useMemo(() => labels.filter((l) => !!l.articleId).length, [labels]);
    const unlinkedCount = labels.length - linkedCount;

    const stats = useMemo(() => [
        { label: t('labels.totalCountShort'), value: labels.length },
        { label: t('labels.linked'), value: linkedCount, color: nativeColors.status.success },
        { label: t('labels.unlinked'), value: unlinkedCount, color: nativeColors.status.warning },
    ], [t, labels.length, linkedCount, unlinkedCount]);

    const handleRefresh = useCallback(async () => {
        if (activeStoreId) await fetchLabels(activeStoreId);
    }, [activeStoreId, fetchLabels]);

    const handleLinkTap = useCallback(async (label: LabelArticleLink) => {
        if (!activeStoreId) return;
        if (label.articleId) {
            // Unlink
            await unlinkLabelFromArticle(activeStoreId, label.labelCode).catch(() => {});
        } else {
            // Navigate to link page with pre-filled label code
            navigate(`/labels/link?labelCode=${encodeURIComponent(label.labelCode)}`);
        }
    }, [activeStoreId, unlinkLabelFromArticle, navigate]);

    const totalPages = Math.ceil(filteredLabels.length / PAGE_SIZE);

    return (
        <NativePage onRefresh={handleRefresh} noPadding>
            {/* Stat bar */}
            <NativeStatBar stats={stats} />

            {/* Search + toggle row */}
            <Box sx={{ px: 1, py: 0.5 }}>
                <NativeSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t('labels.search')}
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={filterLinkedOnly}
                            onChange={(e) => setFilterLinkedOnly(e.target.checked)}
                            size="small"
                        />
                    }
                    label={
                        <Typography variant="caption">{t('labels.filterLinkedOnly')}</Typography>
                    }
                    sx={{ mt: 0.5, ml: 0.5 }}
                />
            </Box>

            {/* Labels list */}
            <Box
                sx={{
                    flex: 1,
                    px: `${nativeSpacing.pagePadding}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                {error && (
                    <Typography variant="body2" color="error" sx={{ mt: 2, textAlign: 'center' }}>
                        {error}
                    </Typography>
                )}

                {!isLoading && !error && paginatedLabels.length === 0 && (
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                        <NativeEmptyState
                            icon={<LabelIcon />}
                            title={
                                searchQuery || filterLinkedOnly
                                    ? t('common.noResults', 'No results found')
                                    : t('labels.noLabels')
                            }
                        />
                    </Box>
                )}

                {paginatedLabels.map((label) => (
                    <NativeLabelCard
                        key={label.labelCode}
                        labelCode={label.labelCode}
                        articleName={label.articleName || label.articleId || undefined}
                        isLinked={!!label.articleId}
                        onLink={() => handleLinkTap(label)}
                    />
                ))}

                {/* Pagination controls */}
                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 2 }}>
                        <Typography
                            variant="body2"
                            color={page > 0 ? 'primary' : 'text.disabled'}
                            sx={{ cursor: page > 0 ? 'pointer' : 'default' }}
                            onClick={() => page > 0 && setPage((p) => p - 1)}
                        >
                            ‹ {t('common.prev', 'Prev')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {page + 1} / {totalPages}
                        </Typography>
                        <Typography
                            variant="body2"
                            color={page < totalPages - 1 ? 'primary' : 'text.disabled'}
                            sx={{ cursor: page < totalPages - 1 ? 'pointer' : 'default' }}
                            onClick={() => page < totalPages - 1 && setPage((p) => p + 1)}
                        >
                            {t('common.next', 'Next')} ›
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* FAB: Link Label */}
            <Fab
                color="primary"
                onClick={() => navigate('/labels/link')}
                sx={{
                    position: 'fixed',
                    bottom: `calc(${nativeSizing.bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`,
                    insetInlineEnd: 16,
                }}
                aria-label={t('labels.linkNew')}
            >
                <LinkIcon />
            </Fab>
        </NativePage>
    );
}
