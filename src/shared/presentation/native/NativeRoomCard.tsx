import { memo } from 'react';
import { Box, Typography, Avatar, AvatarGroup } from '@mui/material';
import { NativeCard } from './NativeCard';
import { NativeStatusBadge } from './NativeStatusBadge';
import { nativeColors, nativeSpacing } from '../themes/nativeTokens';
import { useTranslation } from 'react-i18next';

export interface NativeRoomCardProps {
    roomName: string;
    status: 'available' | 'occupied' | 'upcoming';
    meetingInfo?: string;
    participants?: string[];
}

const STATUS_CONFIG = {
    available: { color: 'success' as const, accentColor: nativeColors.status.success },
    occupied: { color: 'error' as const, accentColor: nativeColors.status.error },
    upcoming: { color: 'warning' as const, accentColor: nativeColors.status.warning },
} as const;

export const NativeRoomCard = memo(function NativeRoomCard({ roomName, status, meetingInfo, participants = [] }: NativeRoomCardProps) {
    const { t } = useTranslation();
    const { color, accentColor } = STATUS_CONFIG[status];

    const statusLabels = {
        available: t('conference.available', 'Available'),
        occupied: t('conference.occupied', 'Occupied'),
        upcoming: t('conference.upcoming', 'Upcoming'),
    };

    return (
        <NativeCard accentColor={accentColor}>
            <Box sx={{ p: `${nativeSpacing.cardPadding}px`, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1 }}>
                        {roomName}
                    </Typography>
                    <NativeStatusBadge label={statusLabels[status]} color={color} />
                </Box>

                {/* Meeting info */}
                {meetingInfo && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {meetingInfo}
                    </Typography>
                )}

                {/* Participant avatars */}
                {participants.length > 0 && (
                    <AvatarGroup
                        max={5}
                        sx={{
                            justifyContent: 'flex-start',
                            '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' },
                        }}
                    >
                        {participants.map((name, idx) => (
                            <Avatar
                                key={idx}
                                sx={{ bgcolor: nativeColors.primary.main }}
                                title={name}
                            >
                                {name.charAt(0).toUpperCase()}
                            </Avatar>
                        ))}
                    </AvatarGroup>
                )}
            </Box>
        </NativeCard>
    );
});
