import { Box, Typography } from '@mui/material';
import { nativeSpacing } from '../themes/nativeTokens';

export interface NativeStatItem {
    label: string;
    value: number;
    color?: string;
}

export interface NativeStatBarProps {
    stats: NativeStatItem[];
}

export function NativeStatBar({ stats }: NativeStatBarProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 2,
                px: `${nativeSpacing.pagePadding}px`,
                py: 1,
            }}
        >
            {stats.map((stat, idx) => (
                <Box
                    key={`${stat.label}-${idx}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                >
                    {/* Colored dot */}
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: stat.color ?? 'text.secondary',
                            flexShrink: 0,
                        }}
                    />
                    <Typography
                        variant="body2"
                        component="span"
                        sx={{ fontWeight: 700, lineHeight: 1 }}
                    >
                        {stat.value}
                    </Typography>
                    <Typography
                        variant="body2"
                        component="span"
                        color="text.secondary"
                        sx={{ lineHeight: 1 }}
                    >
                        {stat.label}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
