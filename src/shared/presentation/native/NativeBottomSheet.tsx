import { useState, type ReactNode } from 'react';
import {
    SwipeableDrawer,
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { nativeColors, nativeRadii } from '../themes/nativeTokens';

const sheetPaperSx = {
    borderTopLeftRadius: `${nativeRadii.card}px`,
    borderTopRightRadius: `${nativeRadii.card}px`,
    maxHeight: '50vh',
    display: 'flex',
    flexDirection: 'column',
    pb: 'env(safe-area-inset-bottom)',
} as const;
import { NativeTextField } from './NativeTextField';

export interface NativeBottomSheetItem {
    id: string;
    label: string;
    subtitle?: string;
    icon?: ReactNode;
}

interface NativeBottomSheetProps {
    open: boolean;
    onClose: () => void;
    onSelect: (item: NativeBottomSheetItem) => void;
    items: NativeBottomSheetItem[];
    title?: string;
    selectedId?: string;
    searchable?: boolean;
}

export function NativeBottomSheet({
    open,
    onClose,
    onSelect,
    items,
    title,
    selectedId,
    searchable = false,
}: NativeBottomSheetProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const filtered = query.trim()
        ? items.filter(
              item =>
                  item.label.toLowerCase().includes(query.toLowerCase()) ||
                  item.subtitle?.toLowerCase().includes(query.toLowerCase()),
          )
        : items;

    const handleSelect = (item: NativeBottomSheetItem) => {
        onSelect(item);
        onClose();
        setQuery('');
    };

    const handleClose = () => {
        onClose();
        setQuery('');
    };

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={handleClose}
            onOpen={() => {/* controlled externally */}}
            disableSwipeToOpen
            PaperProps={{ sx: sheetPaperSx }}
        >
            {/* Drag handle */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    pt: 1,
                    pb: 0.5,
                    flexShrink: 0,
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'grey.300',
                    }}
                />
            </Box>

            {/* Title */}
            {title && (
                <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ px: 2, pb: 1, flexShrink: 0 }}
                >
                    {title}
                </Typography>
            )}

            {/* Search */}
            {searchable && (
                <Box sx={{ px: 2, flexShrink: 0 }}>
                    <NativeTextField
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('common.search')}
                        sx={{ mb: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            )}

            {/* Items */}
            <List sx={{ overflow: 'auto', flex: 1, py: 0 }}>
                {filtered.map(item => (
                    <ListItemButton
                        key={item.id}
                        selected={item.id === selectedId}
                        onClick={() => handleSelect(item)}
                        sx={{
                            minHeight: 48,
                            px: 2,
                            '&.Mui-selected': {
                                bgcolor: `${nativeColors.primary.main}14`,
                            },
                        }}
                    >
                        {item.icon && (
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                {item.icon}
                            </ListItemIcon>
                        )}
                        <ListItemText
                            primary={item.label}
                            secondary={item.subtitle}
                        />
                        {item.id === selectedId && (
                            <CheckIcon
                                fontSize="small"
                                sx={{ color: nativeColors.primary.main, ml: 1 }}
                            />
                        )}
                    </ListItemButton>
                ))}
            </List>
        </SwipeableDrawer>
    );
}
