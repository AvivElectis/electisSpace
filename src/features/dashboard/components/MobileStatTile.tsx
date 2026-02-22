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
            p: 1.5,
            bgcolor: alpha(theme.palette[color].main, 0.08),
            borderLeft: 3,
            borderColor: `${color}.main`,
            borderRadius: 1,
        }}>
            <Typography variant="h5" fontWeight={700} color={`${color}.main`}>
                {value}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>
        </Box>
    );
}
