/**
 * usePerformanceMonitor Hook Tests
 * Phase 10.34 - Deep Testing System
 * 
 * Tests performance monitoring for component renders
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePerformanceMonitor } from './usePerformanceMonitor';

describe('usePerformanceMonitor Hook', () => {
    const originalWindow = global.window;
    
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset performance metrics
        if (typeof window !== 'undefined') {
            (window as any).__PERFORMANCE_METRICS__ = undefined;
        }
    });

    afterEach(() => {
        if (typeof window !== 'undefined') {
            (window as any).__PERFORMANCE_METRICS__ = undefined;
        }
    });

    describe('disabled state', () => {
        it('should not track when disabled', () => {
            renderHook(() => usePerformanceMonitor('TestComponent', false));
            
            expect((window as any).__PERFORMANCE_METRICS__).toBeUndefined();
        });

        it('should not throw when disabled', () => {
            expect(() => {
                renderHook(() => usePerformanceMonitor('TestComponent', false));
            }).not.toThrow();
        });
    });

    describe('enabled state', () => {
        it('should track metrics when enabled', () => {
            renderHook(() => usePerformanceMonitor('TestComponent', true));
            
            expect((window as any).__PERFORMANCE_METRICS__).toBeDefined();
            expect((window as any).__PERFORMANCE_METRICS__['TestComponent']).toBeDefined();
        });

        it('should store component name in metrics', () => {
            renderHook(() => usePerformanceMonitor('MyComponent', true));
            
            const metrics = (window as any).__PERFORMANCE_METRICS__['MyComponent'];
            expect(metrics.componentName).toBe('MyComponent');
        });

        it('should count renders', () => {
            const { rerender } = renderHook(() => usePerformanceMonitor('CountComponent', true));
            
            rerender();
            rerender();
            
            const metrics = (window as any).__PERFORMANCE_METRICS__['CountComponent'];
            expect(metrics.renderCount).toBe(3);
        });

        it('should track render duration', () => {
            renderHook(() => usePerformanceMonitor('DurationComponent', true));
            
            const metrics = (window as any).__PERFORMANCE_METRICS__['DurationComponent'];
            expect(typeof metrics.lastRenderDuration).toBe('number');
            expect(metrics.lastRenderDuration).toBeGreaterThanOrEqual(0);
        });

        it('should calculate average render duration', () => {
            const { rerender } = renderHook(() => usePerformanceMonitor('AvgComponent', true));
            
            rerender();
            rerender();
            
            const metrics = (window as any).__PERFORMANCE_METRICS__['AvgComponent'];
            expect(typeof metrics.averageRenderDuration).toBe('number');
            expect(metrics.averageRenderDuration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('multiple components', () => {
        it('should track different components separately', () => {
            renderHook(() => usePerformanceMonitor('ComponentA', true));
            renderHook(() => usePerformanceMonitor('ComponentB', true));
            
            expect((window as any).__PERFORMANCE_METRICS__['ComponentA']).toBeDefined();
            expect((window as any).__PERFORMANCE_METRICS__['ComponentB']).toBeDefined();
        });

        it('should not interfere between components', () => {
            const { rerender: rerenderA } = renderHook(() => usePerformanceMonitor('CompA', true));
            renderHook(() => usePerformanceMonitor('CompB', true));
            
            rerenderA();
            rerenderA();
            
            expect((window as any).__PERFORMANCE_METRICS__['CompA'].renderCount).toBe(3);
            expect((window as any).__PERFORMANCE_METRICS__['CompB'].renderCount).toBe(1);
        });
    });

    describe('return value', () => {
        it('should return void', () => {
            const { result } = renderHook(() => usePerformanceMonitor('VoidComponent', true));
            
            expect(result.current).toBeUndefined();
        });
    });
});
