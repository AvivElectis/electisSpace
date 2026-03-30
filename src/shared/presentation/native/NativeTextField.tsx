import { memo } from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { nativeRadii, nativeSizing } from '../themes/nativeTokens';

export type NativeTextFieldProps = Omit<TextFieldProps, 'variant'>;

export const NativeTextField = memo(function NativeTextField({ sx, ...rest }: NativeTextFieldProps) {
    return (
        <TextField
            variant="filled"
            fullWidth
            sx={{
                mb: 2,
                '& .MuiFilledInput-root': {
                    borderRadius: `${nativeRadii.input}px`,
                    minHeight: nativeSizing.touchMinHeight,
                    '&::before': { display: 'none' },
                    '&::after': { display: 'none' },
                    '&:hover::before': { display: 'none' },
                },
                '& .MuiFilledInput-input': {
                    pt: '20px',
                    pb: '8px',
                },
                ...sx,
            }}
            {...rest}
        />
    );
});
