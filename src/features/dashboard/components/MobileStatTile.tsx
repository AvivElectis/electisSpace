import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

interface MobileStatTileProps {
    value: number;
    label: string;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

export function MobileStatTile({ value, label, color }: MobileStatTileProps) {
    const theme = useTheme();

    return (
        <Box sx={{
            flex: 1,
            p: 1,
            bgcolor: alpha(theme.palette[color].main, 0.08),
            borderLeft: 3,
            borderColor: `${color}.main`,
            borderRadius: 1,
        }}>
            <Typography variant="subtitle1" fontWeight={700} color={`${color}.main`}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {label}
            </Typography>
        </Box>
    );
}
