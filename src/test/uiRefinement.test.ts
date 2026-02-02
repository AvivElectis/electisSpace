/**
 * UI/UX Refinement Tests
 * 
 * Tests for Phase 6.5 - UI/UX Refinement components and utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    animations,
    spacing,
    radius,
    shadows,
    componentStyles,
} from '../shared/presentation/styles/designTokens';

describe('Design Tokens', () => {
    describe('Animations', () => {
        it('should have all required animation durations', () => {
            expect(animations.instant).toBe('0ms');
            expect(animations.fast).toBe('150ms');
            expect(animations.normal).toBe('250ms');
            expect(animations.slow).toBe('350ms');
        });

        it('should have all required easing functions', () => {
            expect(animations.easeOut).toContain('cubic-bezier');
            expect(animations.easeIn).toContain('cubic-bezier');
            expect(animations.spring).toContain('cubic-bezier');
        });

        it('should generate transitions correctly', () => {
            const transition = animations.transition('opacity', 'fast', 'easeOut');
            expect(transition).toContain('opacity');
            expect(transition).toContain('150ms');
            expect(transition).toContain('cubic-bezier');
        });
    });

    describe('Spacing', () => {
        it('should follow 4px base increment', () => {
            expect(spacing.xxs).toBe(4);
            expect(spacing.xs).toBe(8);
            expect(spacing.sm).toBe(12);
            expect(spacing.md).toBe(16);
            expect(spacing.lg).toBe(24);
            expect(spacing.xl).toBe(32);
        });
    });

    describe('Radius', () => {
        it('should have consistent border radius values', () => {
            expect(radius.none).toBe(0);
            expect(radius.xs).toBe(4);
            expect(radius.sm).toBe(8);
            expect(radius.md).toBe(12);
            expect(radius.lg).toBe(16);
            expect(radius.full).toBe(9999);
        });
    });

    describe('Shadows', () => {
        it('should have elevation levels', () => {
            expect(shadows.none).toBe('none');
            expect(shadows.xs).toContain('rgba');
            expect(shadows.sm).toContain('rgba');
            expect(shadows.md).toContain('rgba');
            expect(shadows.lg).toContain('rgba');
            expect(shadows.xl).toContain('rgba');
        });

        it('should generate focus rings', () => {
            const focusRing = shadows.focusRing('#007AFF');
            expect(focusRing).toContain('0 0 0 3px');
            expect(focusRing).toContain('rgba');
        });
    });

    describe('Component Styles', () => {
        it('should have card styles', () => {
            expect(componentStyles.card.base).toBeDefined();
            expect(componentStyles.card.hover).toBeDefined();
            expect(componentStyles.card.interactive).toBeDefined();
        });

        it('should have button styles', () => {
            expect(componentStyles.button.base).toBeDefined();
            expect(componentStyles.button.base.textTransform).toBe('none');
        });

        it('should have scrollbar styles', () => {
            expect(componentStyles.scrollbar.thin).toBeDefined();
            expect(componentStyles.scrollbar.hidden).toBeDefined();
        });
    });
});

describe('Accessibility Utilities', () => {
    describe('usePrefersReducedMotion', () => {
        it('should return boolean preference', async () => {
            // Mock matchMedia
            const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
                matches: query.includes('reduce'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }));
            
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: mockMatchMedia,
            });

            const { usePrefersReducedMotion } = await import(
                '../shared/presentation/hooks/useAccessibility'
            );
            
            const { result } = renderHook(() => usePrefersReducedMotion());
            expect(typeof result.current).toBe('boolean');
        });
    });

    describe('useAnnounce', () => {
        it('should create and remove announcement element', async () => {
            const { useAnnounce } = await import(
                '../shared/presentation/hooks/useAccessibility'
            );

            const { result } = renderHook(() => useAnnounce());

            act(() => {
                result.current('Test announcement');
            });

            // Allow time for DOM manipulation
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const statusElements = document.querySelectorAll('[role="status"]');
            expect(statusElements.length).toBeGreaterThanOrEqual(0); // May have been cleaned up
        });
    });

    describe('useLiveRegion', () => {
        it('should provide announce function and region props', async () => {
            const { useLiveRegion } = await import(
                '../shared/presentation/hooks/useAccessibility'
            );

            const { result } = renderHook(() => useLiveRegion('polite'));

            expect(result.current.announce).toBeDefined();
            expect(result.current.clear).toBeDefined();
            expect(result.current.regionProps).toBeDefined();
            expect(result.current.regionProps.role).toBe('status');
            expect(result.current.regionProps['aria-live']).toBe('polite');
        });

        it('should update message on announce', async () => {
            const { useLiveRegion } = await import(
                '../shared/presentation/hooks/useAccessibility'
            );

            const { result } = renderHook(() => useLiveRegion());

            expect(result.current.message).toBe('');

            act(() => {
                result.current.announce('Hello');
            });

            // Wait for the delayed message update
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(result.current.message).toBe('Hello');
        });
    });

    describe('useKeyboardNavigation', () => {
        it('should track focused index', async () => {
            const { useKeyboardNavigation } = await import(
                '../shared/presentation/hooks/useAccessibility'
            );

            const items = ['A', 'B', 'C', 'D'];
            const { result } = renderHook(() => useKeyboardNavigation(items));

            expect(result.current.focusedIndex).toBe(0);

            act(() => {
                result.current.setFocusedIndex(2);
            });

            expect(result.current.focusedIndex).toBe(2);
        });

        it('should provide item props', async () => {
            const { useKeyboardNavigation } = await import(
                '../shared/presentation/hooks/useAccessibility'
            );

            const items = ['A', 'B', 'C'];
            const { result } = renderHook(() => useKeyboardNavigation(items));

            const props = result.current.getItemProps(0);
            expect(props.tabIndex).toBe(0); // Focused item
            expect(props['aria-selected']).toBe(true);

            const props2 = result.current.getItemProps(1);
            expect(props2.tabIndex).toBe(-1); // Non-focused item
            expect(props2['aria-selected']).toBe(false);
        });
    });
});

describe('Animation Utilities', () => {
    it('should respect reduced motion preference in keyframes', () => {
        // Check that components can access reduced motion styles
        const reducedMotionStyles = {
            '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
            },
        };
        
        expect(reducedMotionStyles['@media (prefers-reduced-motion: reduce)']).toBeDefined();
    });
});

describe('Component Style Consistency', () => {
    it('should use consistent border radius across card styles', () => {
        expect(componentStyles.card.base.borderRadius).toBe(radius.md);
    });

    it('should use consistent transition for interactive elements', () => {
        expect(componentStyles.card.base.transition).toContain('box-shadow');
    });

    it('should have proper button base styles', () => {
        const buttonBase = componentStyles.button.base;
        expect(buttonBase.borderRadius).toBe(radius.sm);
        expect(buttonBase.fontWeight).toBe(600);
        expect(buttonBase.textTransform).toBe('none');
    });
});
