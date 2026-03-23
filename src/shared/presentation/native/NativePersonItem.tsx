import { memo } from 'react';
import { Box, Avatar, Typography, Chip } from '@mui/material';
import { nativeColors } from '../themes/nativeTokens';

export interface NativePersonItemProps {
    name: string;
    subtitle?: string;
    spaceBadge?: string;
    isAssigned?: boolean;
    avatarColor?: string;
}

export const NativePersonItem = memo(function NativePersonItem({
    name,
    subtitle,
    spaceBadge,
    isAssigned = false,
    avatarColor,
}: NativePersonItemProps) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const bgColor = avatarColor ?? nativeColors.primary.main;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', overflow: 'hidden' }}>
            {/* Avatar */}
            <Avatar
                sx={{
                    bgcolor: bgColor,
                    color: '#fff',
                    width: 40,
                    height: 40,
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                }}
            >
                {initial}
            </Avatar>

            {/* Text */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    noWrap
                    sx={{ lineHeight: 1.3 }}
                >
                    {name}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ lineHeight: 1.3 }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>

            {/* Space badge */}
            {spaceBadge && (
                <Chip
                    label={spaceBadge}
                    size="small"
                    sx={{
                        flexShrink: 0,
                        bgcolor: isAssigned
                            ? `${nativeColors.status.info}22`
                            : `${nativeColors.status.warning}22`,
                        color: isAssigned
                            ? nativeColors.status.info
                            : nativeColors.status.warning,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 22,
                        '& .MuiChip-label': { px: 1 },
                    }}
                />
            )}
        </Box>
    );
});
