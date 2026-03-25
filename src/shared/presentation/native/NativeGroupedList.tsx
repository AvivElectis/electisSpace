import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography, Fab } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { NativeCard } from './NativeCard';
import { nativeColors, nativeSpacing, nativeSizing } from '../themes/nativeTokens';

const emptyStateSx = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 } as const;

const outerScrollSx = {
    flex: 1,
    overflowY: 'auto',
} as const;

const sectionHeaderSx = { display: 'flex', alignItems: 'center', gap: 1, mb: 1 } as const;

const sectionIconWrapperSx = { display: 'flex', alignItems: 'center' } as const;

const buttonBaseSx = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: `${nativeSpacing.cardPadding}px`,
    py: 1.5,
    minHeight: `${nativeSizing.touchMinHeight}px`,
    textAlign: 'start',
} as const;

const itemContentSx = { flex: 1, overflow: 'hidden' } as const;

const chevronSx = { color: 'text.disabled', flexShrink: 0, ms: 1 } as const;

const dividerSx = { height: 1, bgcolor: nativeColors.surface.low, mx: 2 } as const;

const itemWrapperSx = { display: 'contents' } as const;

const fabSx = {
    position: 'fixed',
    bottom: `calc(${nativeSizing.bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`,
    insetInlineEnd: 16,
} as const;

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
    fab?: { icon?: ReactNode; onClick: () => void; ariaLabel?: string };
}

const COLOR_MAP: Record<SectionColor, string> = {
    success: nativeColors.status.success,
    warning: nativeColors.status.warning,
    error: nativeColors.status.error,
    info: nativeColors.status.info,
    primary: nativeColors.primary.main,
};

const sectionBoxSx = { mb: `${nativeSpacing.sectionGap}px`, px: `${nativeSpacing.pagePadding}px` } as const;
const labelBaseSx = { fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.08em' } as const;

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
            <Box sx={emptyStateSx}>
                {emptyState}
            </Box>
        );
    }

    return (
        <Box sx={outerScrollSx}>
            {sections.map((section) => {
                const color = COLOR_MAP[section.color];
                return (
                    <Box key={section.title} sx={sectionBoxSx}>
                        {/* Section header */}
                        <Box sx={sectionHeaderSx}>
                            {section.icon && (
                                <Box sx={{ color, ...sectionIconWrapperSx }}>
                                    {section.icon}
                                </Box>
                            )}
                            <Typography
                                variant="overline"
                                sx={{ color, ...labelBaseSx }}
                            >
                                {section.title} ({section.count})
                            </Typography>
                        </Box>

                        {/* Items card */}
                        {section.items.length > 0 && (
                            <NativeCard>
                                {section.items.map((item, idx) => (
                                    <Box key={keyExtractor(item)} sx={itemWrapperSx}>
                                        {idx > 0 && (
                                            <Box sx={dividerSx} />
                                        )}
                                        <ButtonBase
                                            onClick={() => onItemTap(item)}
                                            sx={buttonBaseSx}
                                        >
                                            <Box sx={itemContentSx}>
                                                {renderItem(item)}
                                            </Box>
                                            <ChevronIcon sx={chevronSx} />
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
                    sx={fabSx}
                    aria-label={fab.ariaLabel ?? 'add'}
                >
                    {fab.icon ?? <AddIcon />}
                </Fab>
            )}
        </Box>
    );
}
