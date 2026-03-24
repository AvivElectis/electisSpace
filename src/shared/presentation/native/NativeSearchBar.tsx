import { useState, useRef, useCallback, useEffect } from 'react';
import { IconButton, TextField, InputAdornment, Collapse } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { nativeRadii } from '../themes/nativeTokens';

export interface NativeSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}

export function NativeSearchBar({
    value,
    onChange,
    placeholder,
    expanded: controlledExpanded,
    onExpandedChange,
}: NativeSearchBarProps) {
    const { t } = useTranslation();
    const [internalExpanded, setInternalExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [inputValue, setInputValue] = useState(value);

    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

    const setExpanded = useCallback(
        (next: boolean) => {
            if (controlledExpanded === undefined) {
                setInternalExpanded(next);
            }
            onExpandedChange?.(next);
        },
        [controlledExpanded, onExpandedChange]
    );

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    // Sync external value → input
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handleExpand = () => {
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleClear = () => {
        setInputValue('');
        onChange('');
        setExpanded(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setInputValue(next);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onChange(next);
        }, 300);
    };

    if (!isExpanded) {
        return (
            <IconButton onClick={handleExpand} size="medium" aria-label={t('common.search', 'Search')}>
                <SearchIcon />
            </IconButton>
        );
    }

    return (
        <Collapse in orientation="horizontal" sx={{ flex: 1 }}>
            <TextField
                inputRef={inputRef}
                value={inputValue}
                onChange={handleChange}
                placeholder={placeholder ?? t('common.search', 'Search')}
                size="small"
                fullWidth
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={handleClear} edge="end">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: `${nativeRadii.input}px`,
                    },
                }}
            />
        </Collapse>
    );
}
