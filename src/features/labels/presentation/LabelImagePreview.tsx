import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Skeleton,
    Tooltip,
    IconButton,
} from '@mui/material';
import { Image as ImageIcon, BrokenImage as BrokenImageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { labelsApi } from '@shared/infrastructure/services/labelsApi';
import { logger } from '@shared/infrastructure/services/logger';

interface LabelImagePreviewProps {
    labelCode: string;
    storeId: string;
    onClick?: () => void;
    size?: number;
}

/**
 * Lazy-loaded label image preview component
 * Uses IntersectionObserver to only load images when visible in viewport
 * Uses server API for image fetching
 */
export function LabelImagePreview({
    labelCode,
    storeId,
    onClick,
    size = 56,
}: LabelImagePreviewProps) {
    const { t } = useTranslation();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
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
                rootMargin: '100px', // Start loading slightly before entering viewport
                threshold: 0.1,
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Fetch image when visible via server API
    const fetchImage = useCallback(async () => {
        if (!storeId) {
            return;
        }

        setIsLoading(true);
        setHasError(false);

        try {
            const response = await labelsApi.getImages(storeId, labelCode);

            // Get the first image from currentImage array
            if (response.data?.currentImage && response.data.currentImage.length > 0) {
                const firstImage = response.data.currentImage[0];
                if (firstImage?.content) {
                    setImageUrl(firstImage.content);
                }
            }
        } catch (error: any) {
            logger.debug('LabelImagePreview', 'Failed to load image', { labelCode, error: error.message });
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [labelCode, storeId]);

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
            {isLoading ? (
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
                        alt={`Label ${labelCode}`}
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
