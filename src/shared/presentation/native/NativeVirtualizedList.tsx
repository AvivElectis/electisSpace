import { useCallback, useRef, useState, useEffect } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Box } from '@mui/material';
import { List as VirtualList } from 'react-window';
import { nativeColors, nativeSpacing, nativeSizing } from '../themes/nativeTokens';

export interface NativeVirtualizedListProps<T> {
    items: T[];
    renderItem: (item: T) => ReactNode;
    onItemTap: (item: T) => void;
    keyExtractor: (item: T) => string;
    itemHeight?: number;
    emptyState?: ReactNode;
}

interface RowProps {
    items: NativeVirtualizedListProps<unknown>['items'];
    renderItem: NativeVirtualizedListProps<unknown>['renderItem'];
    onItemTap: NativeVirtualizedListProps<unknown>['onItemTap'];
}

function RowComponent({
    index,
    style,
    items,
    renderItem,
    onItemTap,
}: RowProps & { index: number; style: CSSProperties }) {
    const item = items[index];
    return (
        <Box
            style={style}
            onClick={() => onItemTap(item)}
            sx={{
                px: `${nativeSpacing.pagePadding}px`,
                cursor: 'pointer',
                '&:active': { bgcolor: nativeColors.surface.low },
            }}
        >
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: `1px solid ${nativeColors.surface.low}`,
                }}
            >
                {renderItem(item)}
            </Box>
        </Box>
    );
}

export function NativeVirtualizedList<T>({
    items,
    renderItem,
    onItemTap,
    keyExtractor: _keyExtractor,
    itemHeight = 72,
    emptyState,
}: NativeVirtualizedListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(400);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setContainerHeight(entry.contentRect.height);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const rowProps = useCallback(
        () => ({
            items: items as unknown[],
            renderItem: renderItem as (item: unknown) => ReactNode,
            onItemTap: onItemTap as (item: unknown) => void,
        }),
        [items, renderItem, onItemTap]
    );

    if (items.length === 0 && emptyState) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                {emptyState}
            </Box>
        );
    }

    // Cast to any to accommodate react-window v2's rowProps type
    const List = VirtualList as any;

    return (
        <Box
            ref={containerRef}
            sx={{
                flex: 1,
                height: '100%',
                pb: `${nativeSizing.bottomNavHeight}px`,
                overflow: 'hidden',
            }}
        >
            <List
                height={containerHeight}
                width="100%"
                rowCount={items.length}
                rowHeight={itemHeight}
                rowComponent={RowComponent}
                rowProps={rowProps()}
            />
        </Box>
    );
}
