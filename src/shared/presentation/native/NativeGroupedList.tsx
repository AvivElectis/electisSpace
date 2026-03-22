import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography, Fab } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { NativeCard } from './NativeCard';
import { nativeColors, nativeSpacing, nativeSizing } from '../themes/nativeTokens';

type SectionColor = 'success' | 'warning' | 'error' | 'info' | 'primary';

export interface NativeGroupedListSection<T> {
    title: string;
    count: number;
    color: SectionColor;
    icon?: ReactNode;
    items: T[];
}

export interface NativeGroupedListProps<T> {
    sections: NativeGroupedListSection<T>[];
    renderItem: (item: T) => ReactNode;
    onItemTap: (item: T) => void;
    keyExtractor: (item: T) => string;
    emptyState?: ReactNode;
    fab?: { icon?: ReactNode; onClick: () => void };
}

const COLOR_MAP: Record<SectionColor, string> = {
    success: nativeColors.status.success,
    warning: nativeColors.status.warning,
    error: nativeColors.status.error,
    info: nativeColors.status.info,
    primary: nativeColors.primary.main,
};

export function NativeGroupedList<T>({
    sections,
    renderItem,
    onItemTap,
    keyExtractor,
    emptyState,
    fab,
}: NativeGroupedListProps<T>) {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'he';
    const ChevronIcon = isRtl ? ChevronLeftIcon : ChevronRightIcon;

    const hasItems = sections.some((s) => s.items.length > 0);

    if (!hasItems && emptyState) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                {emptyState}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                flex: 1,
                overflowY: 'auto',
                pb: `calc(${nativeSizing.bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`,
            }}
        >
            {sections.map((section) => {
                const color = COLOR_MAP[section.color];
                return (
                    <Box key={section.title} sx={{ mb: `${nativeSpacing.sectionGap}px`, px: `${nativeSpacing.pagePadding}px` }}>
                        {/* Section header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {section.icon && (
                                <Box sx={{ color, display: 'flex', alignItems: 'center' }}>
                                    {section.icon}
                                </Box>
                            )}
                            <Typography
                                variant="overline"
                                sx={{ color, fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.08em' }}
                            >
                                {section.title} ({section.count})
                            </Typography>
                        </Box>

                        {/* Items card */}
                        {section.items.length > 0 && (
                            <NativeCard>
                                {section.items.map((item, idx) => (
                                    <Box key={keyExtractor(item)}>
                                        {idx > 0 && (
                                            <Box sx={{ height: 1, bgcolor: nativeColors.surface.low, mx: 2 }} />
                                        )}
                                        <ButtonBase
                                            onClick={() => onItemTap(item)}
                                            sx={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                px: `${nativeSpacing.cardPadding}px`,
                                                py: 1.5,
                                                minHeight: `${nativeSizing.touchMinHeight}px`,
                                                textAlign: 'start',
                                            }}
                                        >
                                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                                {renderItem(item)}
                                            </Box>
                                            <ChevronIcon sx={{ color: 'text.disabled', flexShrink: 0, ms: 1 }} />
                                        </ButtonBase>
                                    </Box>
                                ))}
                            </NativeCard>
                        )}
                    </Box>
                );
            })}

            {/* FAB */}
            {fab && (
                <Fab
                    color="primary"
                    onClick={fab.onClick}
                    sx={{
                        position: 'fixed',
                        bottom: `calc(${nativeSizing.bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`,
                        insetInlineEnd: 16,
                    }}
                >
                    {fab.icon ?? <AddIcon />}
                </Fab>
            )}
        </Box>
    );
}
