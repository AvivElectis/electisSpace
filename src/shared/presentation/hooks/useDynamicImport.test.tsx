/**
 * useDynamicImport Hook Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests dynamic import loading, error handling, and retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDynamicImport } from './useDynamicImport';

describe('useDynamicImport Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should start with null module', () => {
            const importFn = vi.fn(() => Promise.resolve({ default: {} }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            expect(result.current.module).toBeNull();
        });

        it('should start with loading false', () => {
            const importFn = vi.fn(() => Promise.resolve({ default: {} }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            expect(result.current.loading).toBe(false);
        });

        it('should start with no error', () => {
            const importFn = vi.fn(() => Promise.resolve({ default: {} }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            expect(result.current.error).toBeNull();
        });

        it('should provide load, retry, and reset functions', () => {
            const importFn = vi.fn(() => Promise.resolve({ default: {} }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            expect(typeof result.current.load).toBe('function');
            expect(typeof result.current.retry).toBe('function');
            expect(typeof result.current.reset).toBe('function');
        });
    });

    describe('auto-load behavior', () => {
        it('should not auto-load by default', () => {
            const importFn = vi.fn(() => Promise.resolve({ default: {} }));
            
            renderHook(() => useDynamicImport(importFn));
            
            expect(importFn).not.toHaveBeenCalled();
        });

        it('should auto-load when autoLoad is true', async () => {
            const mockModule = { value: 42 };
            const importFn = vi.fn(() => Promise.resolve({ default: mockModule }));
            
            const { result } = renderHook(() => useDynamicImport(importFn, true));
            
            await waitFor(() => {
                expect(result.current.module).toEqual(mockModule);
            });
            expect(importFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('manual load', () => {
        it('should load module when load is called', async () => {
            const mockModule = { name: 'test' };
            const importFn = vi.fn(() => Promise.resolve({ default: mockModule }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                await result.current.load();
            });
            
            expect(result.current.module).toEqual(mockModule);
        });

        it('should set loading true during import', async () => {
            let resolveImport: (value: { default: object }) => void;
            const importFn = vi.fn(() => new Promise<{ default: object }>((resolve) => {
                resolveImport = resolve;
            }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            // Start loading
            act(() => {
                result.current.load();
            });
            
            expect(result.current.loading).toBe(true);
            
            // Complete loading
            await act(async () => {
                resolveImport!({ default: {} });
            });
            
            expect(result.current.loading).toBe(false);
        });

        it('should not re-import if already loaded', async () => {
            const mockModule = { id: 1 };
            const importFn = vi.fn(() => Promise.resolve({ default: mockModule }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                await result.current.load();
            });
            
            await act(async () => {
                await result.current.load();
            });
            
            expect(importFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('error handling', () => {
        it('should set error on import failure', async () => {
            const testError = new Error('Import failed');
            const importFn = vi.fn(() => Promise.reject(testError));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                try {
                    await result.current.load();
                } catch {
                    // Expected error
                }
            });
            
            expect(result.current.error).toBe(testError);
            expect(result.current.module).toBeNull();
        });

        it('should set loading false on error', async () => {
            const importFn = vi.fn(() => Promise.reject(new Error('Failed')));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                try {
                    await result.current.load();
                } catch {
                    // Expected
                }
            });
            
            expect(result.current.loading).toBe(false);
        });
    });

    describe('retry functionality', () => {
        it('should clear error and retry import', async () => {
            let callCount = 0;
            const mockModule = { retried: true };
            const importFn = vi.fn(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.reject(new Error('First attempt failed'));
                }
                return Promise.resolve({ default: mockModule });
            });
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            // First attempt fails
            await act(async () => {
                try {
                    await result.current.load();
                } catch {
                    // Expected
                }
            });
            
            expect(result.current.error).not.toBeNull();
            
            // Retry succeeds
            await act(async () => {
                await result.current.retry();
            });
            
            expect(result.current.error).toBeNull();
            expect(result.current.module).toEqual(mockModule);
        });
    });

    describe('reset functionality', () => {
        it('should reset state to initial values', async () => {
            const mockModule = { data: 'test' };
            const importFn = vi.fn(() => Promise.resolve({ default: mockModule }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                await result.current.load();
            });
            
            expect(result.current.module).toEqual(mockModule);
            
            act(() => {
                result.current.reset();
            });
            
            expect(result.current.module).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('module formats', () => {
        it('should handle default exports', async () => {
            const mockModule = { type: 'default' };
            const importFn = vi.fn(() => Promise.resolve({ default: mockModule }));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                await result.current.load();
            });
            
            expect(result.current.module).toEqual(mockModule);
        });

        it('should handle modules without default export', async () => {
            const mockModule = { named: 'export' };
            const importFn = vi.fn(() => Promise.resolve(mockModule));
            
            const { result } = renderHook(() => useDynamicImport(importFn));
            
            await act(async () => {
                await result.current.load();
            });
            
            expect(result.current.module).toEqual(mockModule);
        });
    });
});
