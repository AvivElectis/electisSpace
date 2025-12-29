import { useState, useEffect, useCallback } from 'react';

/**
 * State for dynamic import
 */
interface DynamicImportState<T> {
    /** The imported module (null if not loaded) */
    module: T | null;
    /** Whether the module is currently loading */
    loading: boolean;
    /** Error that occurred during import (if any) */
    error: Error | null;
}

/**
 * Return type for useDynamicImport hook
 */
interface UseDynamicImportResult<T> extends DynamicImportState<T> {
    /** Function to trigger the import */
    load: () => Promise<void>;
    /** Function to retry after an error */
    retry: () => Promise<void>;
    /** Function to reset the state */
    reset: () => void;
}

/**
 * Custom hook for managing dynamic imports
 * Provides loading state, error handling, and retry logic
 * 
 * @param importFn - Function that returns a dynamic import promise
 * @param autoLoad - Whether to automatically load on mount (default: false)
 * @returns Object with module, loading state, error, and control functions
 * 
 * @example
 * // Lazy load a heavy library
 * const { module: JSZip, loading, error, load } = useDynamicImport(
 *   () => import('jszip')
 * );
 * 
 * // Load when user clicks export
 * const handleExport = async () => {
 *   if (!JSZip) await load();
 *   // Use JSZip...
 * };
 * 
 * @example
 * // Auto-load on mount
 * const { module: editor, loading } = useDynamicImport(
 *   () => import('vanilla-jsoneditor'),
 *   true
 * );
 */
export function useDynamicImport<T>(
    importFn: () => Promise<{ default: T } | T>,
    autoLoad: boolean = false
): UseDynamicImportResult<T> {
    const [state, setState] = useState<DynamicImportState<T>>({
        module: null,
        loading: false,
        error: null,
    });

    const load = useCallback(async () => {
        // Don't reload if already loaded or loading
        if (state.module || state.loading) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const imported = await importFn();
            // Handle both default exports and named exports
            const module = ('default' in imported ? imported.default : imported) as T;
            setState({ module, loading: false, error: null });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to load module');
            setState({ module: null, loading: false, error });
            console.error('[useDynamicImport] Import failed:', error);
        }
    }, [importFn, state.module, state.loading]);

    const retry = useCallback(async () => {
        setState({ module: null, loading: false, error: null });
        await load();
    }, [load]);

    const reset = useCallback(() => {
        setState({ module: null, loading: false, error: null });
    }, []);

    // Auto-load on mount if requested
    useEffect(() => {
        if (autoLoad) {
            load();
        }
    }, [autoLoad, load]);

    return {
        ...state,
        load,
        retry,
        reset,
    };
}
