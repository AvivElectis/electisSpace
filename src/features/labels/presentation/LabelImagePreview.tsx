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
const imageCache = new Map<string, { content: string; fetchedAt: number }>();

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
    const fetchImage = useCallback(async () => {
        const solumConfig = useSettingsStore.getState().settings.solumConfig;
        if (!solumConfig?.isConnected) return;

        setIsLoading(true);
        setHasError(false);

        try {
            const data = await withAimsTokenRefresh(async (token) => {
                return getLabelImages(solumConfig, solumConfig.storeNumber, token, labelCode);
            });

            if (data?.currentImage && data.currentImage.length > 0) {
                const content = data.currentImage[0]?.content;
                if (content) {
                    const cached = imageCache.get(labelCode);
                    // Only update state if content actually changed
                    if (!cached || cached.content !== content) {
                        imageCache.set(labelCode, { content, fetchedAt: Date.now() });
                        setImageUrl(content);
                    } else if (!imageUrl) {
                        // First render with cached content
                        setImageUrl(content);
                    }
                }
            }
        } catch (error: any) {
            logger.debug('LabelImagePreview', 'Failed to load image', { labelCode, error: error.message });
            if (!imageUrl) setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [labelCode, imageUrl]);

    // Trigger fetch when visible
    useEffect(() => {
        if (isVisible && !imageUrl && !isLoading && !hasError) {
            fetchImage();
        }
    }, [isVisible, imageUrl, isLoading, hasError, fetchImage]);

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
