import { Box, Chip } from '@mui/material';
import { nativeSpacing } from '../themes/nativeTokens';

export interface NativeChipBarChip {
    label: string;
    value: string;
}

export interface NativeChipBarProps {
    chips: NativeChipBarChip[];
    activeValue: string;
    onChange: (value: string) => void;
}

export function NativeChipBar({ chips, activeValue, onChange }: NativeChipBarProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'row',
                overflowX: 'auto',
                flexWrap: 'nowrap',
                gap: 1,
                px: `${nativeSpacing.pagePadding}px`,
                py: 1,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}
        >
            {chips.map((chip) => {
                const isActive = chip.value === activeValue;
                return (
                    <Chip
                        key={chip.value}
                        label={chip.label}
                        onClick={() => onChange(chip.value)}
                        color={isActive ? 'primary' : 'default'}
                        variant={isActive ? 'filled' : 'outlined'}
                        sx={{ flexShrink: 0 }}
                    />
                );
            })}
        </Box>
    );
}
