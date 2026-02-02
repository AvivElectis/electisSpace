/**
 * Accessibility Hooks
 * 
 * Custom hooks for improved accessibility support.
 * Phase 6.5 - UI/UX Refinement
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Detects user's motion preference
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
}

/**
 * Detects user's color scheme preference
 */
export function usePrefersColorScheme(): 'light' | 'dark' {
    const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (event: MediaQueryListEvent) => {
            setColorScheme(event.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return colorScheme;
}

/**
 * Manages focus trap within a container
 */
export function useFocusTrap(isActive: boolean = true) {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        firstElement?.focus();

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive]);

    return containerRef;
}

/**
 * Announces content to screen readers
 */
export function useAnnounce() {
    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        
        document.body.appendChild(announcement);
        
        // Delay to ensure screen readers pick up the change
        setTimeout(() => {
            announcement.textContent = message;
        }, 100);

        // Clean up after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }, []);

    return announce;
}

/**
 * Manages keyboard navigation for lists
 */
export function useKeyboardNavigation<T>(
    items: T[],
    options?: {
        loop?: boolean;
        orientation?: 'horizontal' | 'vertical' | 'both';
        onSelect?: (item: T, index: number) => void;
    }
) {
    const [focusedIndex, setFocusedIndex] = useState(0);
    const { loop = true, orientation = 'vertical', onSelect } = options || {};

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        let newIndex = focusedIndex;

        const upKeys = orientation === 'horizontal' ? ['ArrowLeft'] : 
                       orientation === 'vertical' ? ['ArrowUp'] : ['ArrowUp', 'ArrowLeft'];
        const downKeys = orientation === 'horizontal' ? ['ArrowRight'] : 
                        orientation === 'vertical' ? ['ArrowDown'] : ['ArrowDown', 'ArrowRight'];

        if (upKeys.includes(event.key)) {
            event.preventDefault();
            newIndex = focusedIndex - 1;
            if (newIndex < 0) {
                newIndex = loop ? items.length - 1 : 0;
            }
        } else if (downKeys.includes(event.key)) {
            event.preventDefault();
            newIndex = focusedIndex + 1;
            if (newIndex >= items.length) {
                newIndex = loop ? 0 : items.length - 1;
            }
        } else if (event.key === 'Home') {
            event.preventDefault();
            newIndex = 0;
        } else if (event.key === 'End') {
            event.preventDefault();
            newIndex = items.length - 1;
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.(items[focusedIndex], focusedIndex);
            return;
        }

        setFocusedIndex(newIndex);
    }, [focusedIndex, items, loop, orientation, onSelect]);

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        getItemProps: (index: number) => ({
            tabIndex: index === focusedIndex ? 0 : -1,
            'aria-selected': index === focusedIndex,
            onFocus: () => setFocusedIndex(index),
        }),
    };
}

/**
 * Provides skip navigation functionality
 */
export function useSkipNavigation(targetId: string) {
    const skipToContent = useCallback(() => {
        const target = document.getElementById(targetId);
        if (target) {
            target.setAttribute('tabindex', '-1');
            target.focus();
            target.removeAttribute('tabindex');
        }
    }, [targetId]);

    return skipToContent;
}

/**
 * Manages ARIA live region updates
 */
export function useLiveRegion(ariaLive: 'polite' | 'assertive' = 'polite') {
    const [message, setMessage] = useState('');

    const announce = useCallback((newMessage: string) => {
        // Clear and re-set to trigger re-announcement
        setMessage('');
        setTimeout(() => setMessage(newMessage), 100);
    }, []);

    const clear = useCallback(() => {
        setMessage('');
    }, []);

    const regionProps = {
        role: 'status' as const,
        'aria-live': ariaLive,
        'aria-atomic': true,
        children: message,
        style: {
            position: 'absolute' as const,
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap' as const,
            border: 0,
        },
    };

    return { announce, clear, regionProps, message };
}
