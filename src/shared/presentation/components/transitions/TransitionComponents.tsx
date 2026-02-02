/**
 * Transition Components
 * 
 * Reusable animated wrapper components for smooth UI transitions.
 * Phase 6.5 - UI/UX Refinement
 */

import { Box, Fade, Grow, Slide, Collapse, type BoxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { animations } from '../../styles/designTokens';

interface BaseTransitionProps {
    children: ReactNode;
    show?: boolean;
    duration?: 'fast' | 'normal' | 'slow';
    delay?: number;
}

const getDuration = (duration: 'fast' | 'normal' | 'slow'): number => {
    const durations = { fast: 150, normal: 250, slow: 350 };
    return durations[duration];
};

/**
 * FadeIn - Smooth opacity transition
 */
export function FadeIn({
    children,
    show = true,
    duration = 'normal',
    delay = 0,
}: BaseTransitionProps) {
    return (
        <Fade
            in={show}
            timeout={getDuration(duration)}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <Box>{children}</Box>
        </Fade>
    );
}

/**
 * GrowIn - Scale and fade transition
 */
export function GrowIn({
    children,
    show = true,
    duration = 'normal',
    delay = 0,
}: BaseTransitionProps) {
    return (
        <Grow
            in={show}
            timeout={getDuration(duration)}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <Box>{children}</Box>
        </Grow>
    );
}

interface SlideInProps extends BaseTransitionProps {
    direction?: 'up' | 'down' | 'left' | 'right';
}

/**
 * SlideIn - Directional slide transition
 */
export function SlideIn({
    children,
    show = true,
    duration = 'normal',
    delay = 0,
    direction = 'up',
}: SlideInProps) {
    return (
        <Slide
            in={show}
            direction={direction}
            timeout={getDuration(duration)}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <Box>{children}</Box>
        </Slide>
    );
}

/**
 * CollapseIn - Height collapse transition
 */
export function CollapseIn({
    children,
    show = true,
    duration = 'normal',
}: Omit<BaseTransitionProps, 'delay'>) {
    return (
        <Collapse
            in={show}
            timeout={getDuration(duration)}
        >
            {children}
        </Collapse>
    );
}

interface StaggeredListProps {
    children: ReactNode[];
    show?: boolean;
    staggerDelay?: number;
    animation?: 'fade' | 'slideUp' | 'grow';
}

/**
 * StaggeredList - Animate list items with stagger effect
 */
export function StaggeredList({
    children,
    show = true,
    staggerDelay = 50,
    animation = 'fade',
}: StaggeredListProps) {
    const AnimationComponent = {
        fade: FadeIn,
        slideUp: ({ children: c, delay }: { children: ReactNode; delay: number }) => (
            <SlideIn direction="up" delay={delay}>{c}</SlideIn>
        ),
        grow: GrowIn,
    }[animation];

    return (
        <>
            {children.map((child, index) => (
                <AnimationComponent key={index} show={show} delay={index * staggerDelay}>
                    {child}
                </AnimationComponent>
            ))}
        </>
    );
}

interface AnimatedBoxProps extends BoxProps {
    animate?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn';
    duration?: 'fast' | 'normal' | 'slow';
    delay?: number;
}

/**
 * AnimatedBox - Box with CSS animation on mount
 */
export function AnimatedBox({
    children,
    animate = 'fadeIn',
    duration = 'normal',
    delay = 0,
    sx,
    ...props
}: AnimatedBoxProps) {
    const animationMap = {
        fadeIn: 'fadeInAnimation',
        slideUp: 'slideUpAnimation',
        slideDown: 'slideDownAnimation',
        scaleIn: 'scaleInAnimation',
    };

    return (
        <Box
            {...props}
            sx={{
                ...sx,
                animation: `${animationMap[animate]} ${getDuration(duration)}ms ${animations.easeOut} forwards`,
                animationDelay: `${delay}ms`,
                opacity: 0,
                '@keyframes fadeInAnimation': {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                '@keyframes slideUpAnimation': {
                    '0%': { opacity: 0, transform: 'translateY(16px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                '@keyframes slideDownAnimation': {
                    '0%': { opacity: 0, transform: 'translateY(-16px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                '@keyframes scaleInAnimation': {
                    '0%': { opacity: 0, transform: 'scale(0.95)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                },
                // Respect reduced motion preference
                '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                    opacity: 1,
                },
            }}
        >
            {children}
        </Box>
    );
}

interface PulseProps extends BoxProps {
    active?: boolean;
}

/**
 * Pulse - Pulsing animation for attention
 */
export function Pulse({ children, active = true, sx, ...props }: PulseProps) {
    return (
        <Box
            {...props}
            sx={{
                ...sx,
                ...(active && {
                    animation: 'pulseAnimation 2s ease-in-out infinite',
                    '@keyframes pulseAnimation': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.6 },
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                        animation: 'none',
                    },
                }),
            }}
        >
            {children}
        </Box>
    );
}

interface SpinProps extends BoxProps {
    speed?: 'slow' | 'normal' | 'fast';
}

/**
 * Spin - Spinning animation for loading states
 */
export function Spin({ children, speed = 'normal', sx, ...props }: SpinProps) {
    const speedMap = { slow: '2s', normal: '1s', fast: '0.5s' };
    
    return (
        <Box
            {...props}
            sx={{
                ...sx,
                display: 'inline-flex',
                animation: `spinAnimation ${speedMap[speed]} linear infinite`,
                '@keyframes spinAnimation': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                },
            }}
        >
            {children}
        </Box>
    );
}
