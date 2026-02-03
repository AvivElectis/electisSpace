import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import type { ReactElement } from 'react';

interface DashboardStatusChipProps extends ChipProps {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    icon?: ReactElement;
}

/**
 * DashboardStatusChip - Reusable status chip for dashboard cards
 */
export function DashboardStatusChip({ label, color, icon, ...props }: DashboardStatusChipProps) {
    return (
        <Chip
            label={label}
            color={color}
            variant="filled"
            size="small"
            icon={icon}
            sx={{ p: 1, fontWeight: 500, ...props.sx }}
            {...props}
        />
    );
}
