/**
 * ErrorBoundary Component Tests
 * Phase 10.26 - Deep Testing System
 * 
 * Tests the ErrorBoundary component for catching and handling React errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Mock the logger
vi.mock('@shared/infrastructure/services/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error from component');
    }
    return <div>Normal content</div>;
}

// Component that renders normally
function NormalComponent() {
    return <div>Hello World</div>;
}

describe('ErrorBoundary Component', () => {
    // Suppress console.error for expected errors
    const originalError = console.error;
    
    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalError;
    });

    describe('normal rendering', () => {
        it('should render children when no error', () => {
            render(
                <ErrorBoundary>
                    <NormalComponent />
                </ErrorBoundary>
            );

            expect(screen.getByText('Hello World')).toBeInTheDocument();
        });

        it('should render multiple children', () => {
            render(
                <ErrorBoundary>
                    <div>Child 1</div>
                    <div>Child 2</div>
                </ErrorBoundary>
            );

            expect(screen.getByText('Child 1')).toBeInTheDocument();
            expect(screen.getByText('Child 2')).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should catch error and display fallback UI', () => {
            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        });

        it('should use custom fallback when provided', () => {
            render(
                <ErrorBoundary fallback={<div>Custom error message</div>}>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            expect(screen.getByText('Custom error message')).toBeInTheDocument();
        });

        it('should call onError callback when error occurs', () => {
            const onError = vi.fn();
            
            render(
                <ErrorBoundary onError={onError}>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                expect.objectContaining({
                    componentStack: expect.any(String),
                })
            );
        });

        it('should log error to logger service', async () => {
            const { logger } = await import('@shared/infrastructure/services/logger');
            
            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('error details', () => {
        it('should show error details when showDetails is true', () => {
            render(
                <ErrorBoundary showDetails>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            // Should show some error information
            expect(screen.getByText(/test error from component/i)).toBeInTheDocument();
        });

        it('should hide error details by default', () => {
            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            // The exact error message should not be visible by default
            // (only the user-friendly message is shown)
            expect(screen.queryByText('Test error from component')).not.toBeInTheDocument();
        });
    });

    describe('recovery actions', () => {
        it('should render reload button', () => {
            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
        });

        it('should render try again button', () => {
            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        });

        it('should reset error state when try again is clicked', () => {
            // Use a stateful wrapper to control the throwing behavior
            let shouldThrow = true;
            function ControlledComponent() {
                if (shouldThrow) {
                    throw new Error('Test error');
                }
                return <div>Recovered content</div>;
            }

            const { rerender } = render(
                <ErrorBoundary>
                    <ControlledComponent />
                </ErrorBoundary>
            );

            // Error should be caught
            expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

            // Stop throwing and click try again
            shouldThrow = false;
            fireEvent.click(screen.getByRole('button', { name: /try again/i }));

            // Need to rerender to see the recovered state
            rerender(
                <ErrorBoundary>
                    <ControlledComponent />
                </ErrorBoundary>
            );

            expect(screen.getByText('Recovered content')).toBeInTheDocument();
        });
    });

    describe('logging integration', () => {
        it('should log info when user clicks reload', async () => {
            const { logger } = await import('@shared/infrastructure/services/logger');
            
            // Mock window.location.reload
            const reloadMock = vi.fn();
            Object.defineProperty(window, 'location', {
                value: { reload: reloadMock },
                writable: true,
            });

            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            fireEvent.click(screen.getByRole('button', { name: /reload/i }));

            expect(logger.info).toHaveBeenCalledWith('App', expect.stringContaining('reload'));
        });

        it('should log info when user clicks try again', async () => {
            const { logger } = await import('@shared/infrastructure/services/logger');
            vi.mocked(logger.info).mockClear();

            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );

            fireEvent.click(screen.getByRole('button', { name: /try again/i }));

            expect(logger.info).toHaveBeenCalledWith('App', expect.stringContaining('reset'));
        });
    });
});
