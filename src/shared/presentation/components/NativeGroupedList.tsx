/**
 * NativeGroupedList
 *
 * iOS-style grouped section list for native pages.
 * Items grouped by status in rounded containers with section headers and chevrons.
 */

import { Box, Typography, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'react-i18next';
import { NATIVE_BOTTOM_NAV_HEIGHT } from '../layouts/NativeBottomNav';

interface Section<T> {
    title: string;
    count: number;
    color: 'primary' | 'warning';
    icon?: React.ReactNode;
    items: T[];
}

interface NativeGroupedListProps<T> {
    sections: Section<T>[];
    renderItem: (item: T) => React.ReactNode;
    onItemTap: (item: T) => void;
    emptyState?: React.ReactNode;
    fab?: { label: string; onClick: () => void };
    keyExtractor: (item: T) => string;
}

export function NativeGroupedList<T>({
    sections,
    renderItem,
    onItemTap,
    emptyState,
    fab,
    keyExtractor,
}: NativeGroupedListProps<T>) {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'he';

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

    if (totalItems === 0 && emptyState) {
        return <>{emptyState}</>;
    }

    const colorMap = {
        primary: { header: 'primary.main' },
        warning: { header: '#e65100' },
    };

    return (
        <Box sx={{ pb: fab ? 10 : 0 }}>
            {sections.map((section) => {
                if (section.items.length === 0) return null;
                const colors = colorMap[section.color];

                return (
                    <Box key={section.title} sx={{ mb: 2 }}>
                        {/* Section header */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 0.5,
                                mb: 1,
                            }}
                        >
                            <Typography
                                variant="overline"
                                sx={{
                                    color: colors.header,
                                    fontWeight: 600,
                                    letterSpacing: 0.8,
                                    fontSize: '0.68rem',
                                }}
                            >
                                {section.title} ({section.count})
                            </Typography>
                            {section.icon}
                        </Box>

                        {/* Items container */}
                        <Box
                            sx={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                        >
                            {section.items.map((item, index) => (
                                <Box
                                    key={keyExtractor(item)}
                                    onClick={() => onItemTap(item)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        px: 2,
                                        py: 1.5,
                                        cursor: 'pointer',
                                        '&:active': { backgroundColor: '#f5f5f5' },
                                        ...(index < section.items.length - 1 ? {
                                            borderBottom: '1px solid #f0f0f0',
                                        } : {}),
                                    }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {renderItem(item)}
                                    </Box>
                                    <ChevronRightIcon
                                        sx={{
                                            color: '#ccc',
                                            fontSize: 20,
                                            flexShrink: 0,
                                            transform: isRtl ? 'scaleX(-1)' : 'none',
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                );
            })}

            {fab && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={fab.onClick}
                    sx={{
                        position: 'fixed',
                        bottom: `calc(${NATIVE_BOTTOM_NAV_HEIGHT + 24}px + env(safe-area-inset-bottom, 0px))`,
                        right: 24,
                        zIndex: 1050,
                        height: 56,
                        px: 3,
                        fontWeight: 600,
                    }}
                >
                    <AddIcon sx={{ mr: isRtl ? 0 : 1, ml: isRtl ? 1 : 0 }} />
                    {fab.label}
                </Fab>
            )}
        </Box>
    );
}
