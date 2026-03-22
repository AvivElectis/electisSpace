import { Box, Typography, IconButton } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ImageIcon from '@mui/icons-material/Image';
import { NativeCard } from './NativeCard';
import { NativeStatusBadge } from './NativeStatusBadge';
import { nativeColors, nativeSpacing } from '../themes/nativeTokens';
import { useTranslation } from 'react-i18next';

export interface NativeLabelCardProps {
    labelCode: string;
    articleName?: string;
    thumbnailUrl?: string;
    isLinked: boolean;
    onLink?: () => void;
    onViewImages?: () => void;
}

export function NativeLabelCard({
    labelCode,
    articleName,
    thumbnailUrl,
    isLinked,
    onLink,
    onViewImages,
}: NativeLabelCardProps) {
    const { t } = useTranslation();

    return (
        <NativeCard
            accentColor={isLinked ? nativeColors.status.success : nativeColors.surface.high}
        >
            <Box
                sx={{
                    p: `${nativeSpacing.cardPadding}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                {/* Thumbnail */}
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        bgcolor: nativeColors.surface.low,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {thumbnailUrl ? (
                        <Box
                            component="img"
                            src={thumbnailUrl}
                            alt={articleName}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <ImageIcon sx={{ color: 'text.disabled' }} />
                    )}
                </Box>

                {/* Text */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{ fontFamily: 'monospace', lineHeight: 1.3 }}
                    >
                        {labelCode}
                    </Typography>
                    {articleName && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.3 }}>
                            {articleName}
                        </Typography>
                    )}
                    <Box sx={{ mt: 0.5 }}>
                        <NativeStatusBadge
                            label={isLinked ? t('labels.linked', 'Linked') : t('labels.unlinked', 'Unlinked')}
                            color={isLinked ? 'success' : 'warning'}
                        />
                    </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                    {onViewImages && (
                        <IconButton size="small" onClick={onViewImages} aria-label={t('labels.viewImages', 'View images')}>
                            <ImageIcon fontSize="small" />
                        </IconButton>
                    )}
                    {onLink && (
                        <IconButton
                            size="small"
                            onClick={onLink}
                            aria-label={isLinked ? t('labels.unlink', 'Unlink') : t('labels.link', 'Link')}
                            sx={{ color: isLinked ? nativeColors.status.success : 'text.secondary' }}
                        >
                            {isLinked ? <LinkIcon fontSize="small" /> : <LinkOffIcon fontSize="small" />}
                        </IconButton>
                    )}
                </Box>
            </Box>
        </NativeCard>
    );
}
