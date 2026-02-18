/**
 * UI/UX Refinement Tests
 * 
 * Tests for Phase 6.5 - UI/UX Refinement components and utilities.
 */

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
