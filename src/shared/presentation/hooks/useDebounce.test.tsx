import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce Hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial value', () => {
        it('should return initial value immediately', () => {
            const { result } = renderHook(() => useDebounce('initial', 300));
            
            expect(result.current).toBe('initial');
        });

        it('should work with numbers', () => {
            const { result } = renderHook(() => useDebounce(42, 300));
            
            expect(result.current).toBe(42);
        });

        it('should work with objects', () => {
            const obj = { name: 'test' };
            const { result } = renderHook(() => useDebounce(obj, 300));
            
            expect(result.current).toEqual({ name: 'test' });
        });

        it('should work with arrays', () => {
            const arr = [1, 2, 3];
            const { result } = renderHook(() => useDebounce(arr, 300));
            
            expect(result.current).toEqual([1, 2, 3]);
        });
    });

    describe('debouncing', () => {
        it('should not update value before delay', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 300),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            // Before delay expires
            act(() => {
                vi.advanceTimersByTime(100);
            });
            
            expect(result.current).toBe('initial');
        });

        it('should update value after delay', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 300),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            // After delay expires
            act(() => {
                vi.advanceTimersByTime(300);
            });
            
            expect(result.current).toBe('updated');
        });

        it('should reset timer on value change', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 300),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'first' });
            act(() => {
                vi.advanceTimersByTime(200);
            });
            
            rerender({ value: 'second' });
            act(() => {
                vi.advanceTimersByTime(200);
            });
            
            // Still waiting for the second update's timer
            expect(result.current).toBe('initial');
            
            act(() => {
                vi.advanceTimersByTime(100);
            });
            
            expect(result.current).toBe('second');
        });
    });

    describe('delay parameter', () => {
        it('should use default 300ms delay', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            act(() => {
                vi.advanceTimersByTime(299);
            });
            expect(result.current).toBe('initial');
            
            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(result.current).toBe('updated');
        });

        it('should respect custom delay', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 500),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            act(() => {
                vi.advanceTimersByTime(400);
            });
            expect(result.current).toBe('initial');
            
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(result.current).toBe('updated');
        });

        it('should handle zero delay', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 0),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            act(() => {
                vi.advanceTimersByTime(0);
            });
            
            expect(result.current).toBe('updated');
        });
    });

    describe('cleanup', () => {
        it('should clear timer on unmount', () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
            
            const { unmount, rerender } = renderHook(
                ({ value }) => useDebounce(value, 300),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            unmount();
            
            expect(clearTimeoutSpy).toHaveBeenCalled();
            
            clearTimeoutSpy.mockRestore();
        });
    });
});
