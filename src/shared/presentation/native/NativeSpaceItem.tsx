import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import ChairIcon from '@mui/icons-material/Chair';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import BusinessIcon from '@mui/icons-material/Business';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useTranslation } from 'react-i18next';
import { nativeColors } from '../themes/nativeTokens';

export interface NativeSpaceItemProps {
    spaceId: string;
    spaceType?: string;
    assignedPerson?: string;
    isLinked?: boolean;
}

function getSpaceIcon(spaceType?: string) {
    const lower = spaceType?.toLowerCase() ?? '';
    if (lower.includes('chair') || lower.includes('desk')) return <ChairIcon />;
    if (lower.includes('room') || lower.includes('office')) return <MeetingRoomIcon />;
    return <BusinessIcon />;
}

export const NativeSpaceItem = memo(function NativeSpaceItem({ spaceId, spaceType, assignedPerson, isLinked }: NativeSpaceItemProps) {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', overflow: 'hidden' }}>
            {/* Type icon */}
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: nativeColors.surface.low,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: nativeColors.primary.main,
                    flexShrink: 0,
                }}
            >
                {getSpaceIcon(spaceType)}
            </Box>

            {/* Text */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography
                    variant="body2"
                    fontWeight={700}
                    noWrap
                    sx={{ lineHeight: 1.3, fontFamily: 'monospace' }}
                >
                    {spaceId}
                </Typography>
                <Typography
                    variant="caption"
                    noWrap
                    sx={{
                        lineHeight: 1.3,
                        color: assignedPerson ? 'text.secondary' : 'text.disabled',
                    }}
                >
                    {assignedPerson ?? t('people.unassigned', 'Unassigned')}
                </Typography>
            </Box>

            {/* Link status icon */}
            {isLinked !== undefined && (
                <Box
                    sx={{
                        color: isLinked ? nativeColors.status.success : 'text.disabled',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    {isLinked ? <LinkIcon fontSize="small" /> : <LinkOffIcon fontSize="small" />}
                </Box>
            )}
        </Box>
    );
});
