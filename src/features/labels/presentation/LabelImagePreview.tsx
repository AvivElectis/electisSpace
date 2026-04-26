import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Skeleton,
    Tooltip,
    IconButton,
} from '@mui/material';
import { Image as ImageIcon, BrokenImage as BrokenImageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@features/settings/infrastructure/settingsStore';
import { withAimsTokenRefresh } from '@shared/infrastructure/services/aimsTokenManager';
import { getLabelImages } from '@shared/infrastructure/services/solum/labelsService';
import { logger } from '@shared/infrastructure/services/logger';

interface LabelImagePreviewProps {
    labelCode: string;
    storeId: string;
    onClick?: () => void;
    size?: number;
}

/** Module-level cache: labelCode → { content, fetchedAt } */
const IMAGE_CACHE_MAX = 200;
const imageCache = new Map<string, { content: string; fetchedAt: number }>();

function setImageCacheEntry(key: string, content: string) {
    // Evict oldest entry if at capacity
    if (imageCache.size >= IMAGE_CACHE_MAX) {
        const oldest = imageCache.keys().next().value;
        if (oldest) imageCache.delete(oldest);
    }
    imageCache.set(key, { content, fetchedAt: Date.now() });
}

/**
 * Lazy-loaded label image preview component
 * Uses IntersectionObserver to only load images when visible in viewport
 * Fetches directly from AIMS with caching — only updates if image content changed
 */
export function LabelImagePreview({
    labelCode,
    storeId: _storeId,
    onClick,
    size = 80,
}: LabelImagePreviewProps) {
    const { t } = useTranslation();
    const [imageUrl, setImageUrl] = useState<string | null>(() => {
        // Initialize from cache if available
        const cached = imageCache.get(labelCode);
        return cached?.content ?? null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '100px',
                threshold: 0.1,
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Fetch image directly from AIMS with caching
    const fetchImage = useCallback(async (signal?: AbortSignal) => {
        const solumConfig = useSettingsStore.getState().settings.solumConfig;
        if (!solumConfig?.isConnected) return;

        setIsLoading(true);
        setHasError(false);

        try {
            const data = await withAimsTokenRefresh(async (token) => {
                return getLabelImages(solumConfig, solumConfig.storeNumber, token, labelCode);
            });

            if (signal?.aborted) return;

            if (data?.currentImage && data.currentImage.length > 0) {
                const content = data.currentImage[0]?.content;
                if (content) {
                    const cached = imageCache.get(labelCode);
                    if (!cached || cached.content !== content) {
                        setImageCacheEntry(labelCode, content);
                    }
                    setImageUrl(content);
                }
            }
        } catch (error: any) {
            if (signal?.aborted) return;
            logger.debug('LabelImagePreview', 'Failed to load image', { labelCode, error: error.message });
            setHasError(true);
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [labelCode]);

    // Trigger fetch when visible.
    // isLoading/hasError are intentionally excluded from deps: fetchImage flips
    // isLoading synchronously, which would re-run this effect and abort its own
    // in-flight request, leaving the preview stuck on the loading skeleton.
    useEffect(() => {
        if (isVisible && !imageUrl && !isLoading && !hasError) {
            const controller = new AbortController();
            fetchImage(controller.signal);
            return () => controller.abort();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, imageUrl, fetchImage]);

    const handleClick = () => {
        onClick?.();
    };

    return (
        <Box
            ref={containerRef}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: onClick ? 'pointer' : 'default',
                p: 0,
                m: 0,
            }}
            onClick={handleClick}
        >
            {isLoading && !imageUrl ? (
                <Skeleton
                    variant="rectangular"
                    width={size}
                    height={size}
                    sx={{ borderRadius: 1 }}
                />
            ) : imageUrl ? (
                <Tooltip title={t('labels.images.view', 'View Images')}>
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={t('labels.images.altLabel', 'Label {{code}}', { code: labelCode })}
                        loading="lazy"
                        sx={{
                            width: size,
                            height: size,
                            objectFit: 'contain',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: 1,
                            },
                        }}
                    />
                </Tooltip>
            ) : hasError ? (
                <Tooltip title={t('labels.images.loadError', 'Failed to load image')}>
                    <IconButton size="small" color="default" onClick={handleClick}>
                        <BrokenImageIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            ) : (
                <Tooltip title={t('labels.images.view', 'View Images')}>
                    <IconButton size="small" color="info" onClick={handleClick}>
                        <ImageIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
}
