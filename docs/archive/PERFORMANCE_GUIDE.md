# Performance Optimization Guide

## Overview

This guide covers performance optimization strategies implemented in the electisSpace application, including bundle optimization, code splitting, lazy loading, and performance monitoring.

## Bundle Optimization

### Code Splitting

The application uses manual code splitting to optimize bundle sizes:

```typescript
// vite.config.ts
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react')) return 'react-vendor';
    if (id.includes('@mui')) return 'mui-vendor';
    if (id.includes('react-hook-form')) return 'form-vendor';
    if (id.includes('i18next')) return 'i18n-vendor';
    if (id.includes('axios')) return 'utils-vendor';
  }
}
```

**Benefits:**
- Smaller initial bundle size
- Better caching (vendor code changes less frequently)
- Parallel loading of chunks

### Compression

Both Gzip and Brotli compression are enabled:

```typescript
// vite.config.ts
plugins: [
  viteCompression({ algorithm: 'gzip', ext: '.gz' }),
  viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
]
```

**Results:**
- Gzip: ~70% size reduction
- Brotli: ~75% size reduction

### Bundle Analysis

Analyze bundle size after building:

```bash
npm run build
npm run analyze
```

This generates `dist/stats.html` showing:
- Bundle composition
- Largest dependencies
- Gzip/Brotli sizes
- Duplicate dependencies

## Lazy Loading

### Route-Based Code Splitting

Routes are lazy-loaded using React.lazy:

```typescript
// AppRoutes.tsx
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const SpacesPage = lazy(() => import('./features/space/presentation/SpacesPage'));
```

**Benefits:**
- Faster initial page load
- Load code only when needed
- Automatic code splitting by route

### Component Lazy Loading

Large components can be lazy-loaded:

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## Performance Monitoring

### Performance Monitor Service

Track performance metrics in development:

```typescript
import { performanceMonitor } from '@shared/infrastructure/monitoring/performanceMonitor';

// Track page load
performanceMonitor.trackPageLoad();

// Track component render
performanceMonitor.trackComponentRender('MyComponent', 150);

// Track API call
performanceMonitor.trackApiCall('/api/spaces', 500);
```

### React Hooks

#### usePerformanceMonitor

Monitor component performance:

```typescript
import { usePerformanceMonitor } from '@shared/presentation/hooks/usePerformanceMonitor';

function MyComponent() {
  usePerformanceMonitor('MyComponent');
  // Component will log render times and re-render counts
}
```

#### useApiPerformanceTracker

Track API call performance:

```typescript
import { useApiPerformanceTracker } from '@shared/presentation/hooks/usePerformanceMonitor';

function MyComponent() {
  const trackApi = useApiPerformanceTracker();
  
  const fetchData = async () => {
    await trackApi('/api/spaces', () => axios.get('/api/spaces'));
  };
}
```

## React Optimization

### React.memo

Prevent unnecessary re-renders:

```typescript
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  // Component only re-renders when data changes
  return <div>{data}</div>;
});
```

### useMemo

Memoize expensive computations:

```typescript
import { useMemo } from 'react';

function MyComponent({ items }) {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);
}
```

### useCallback

Memoize callback functions:

```typescript
import { useCallback } from 'react';

function MyComponent({ onSave }) {
  const handleClick = useCallback(() => {
    onSave();
  }, [onSave]);
}
```

## Image Optimization

### Lazy Loading Images

```typescript
<img 
  src={imageSrc} 
  loading="lazy" 
  alt="Description"
/>
```

### Responsive Images

```typescript
<img
  srcSet="image-320w.jpg 320w, image-640w.jpg 640w"
  sizes="(max-width: 600px) 320px, 640px"
  src="image-640w.jpg"
  alt="Description"
/>
```

## Network Optimization

### API Request Caching

Use React Query or SWR for automatic caching:

```typescript
// Example with custom caching
const cache = new Map();

async function fetchWithCache(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  
  const data = await fetch(url).then(r => r.json());
  cache.set(url, data);
  return data;
}
```

### Request Debouncing

Debounce search inputs:

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash';

function SearchInput({ onSearch }) {
  const debouncedSearch = useMemo(
    () => debounce(onSearch, 300),
    [onSearch]
  );
  
  return <input onChange={(e) => debouncedSearch(e.target.value)} />;
}
```

## Performance Budgets

### Target Metrics

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 300ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Bundle Size Limits

- **Main bundle**: < 500KB (gzipped)
- **Vendor chunks**: < 300KB each (gzipped)
- **Route chunks**: < 100KB each (gzipped)

## Measuring Performance

### Lighthouse

Run Lighthouse audit:

```bash
npm run build
npm run preview
# Open Chrome DevTools > Lighthouse > Generate Report
```

### Chrome DevTools

1. **Performance Tab**: Record and analyze runtime performance
2. **Network Tab**: Check resource loading times
3. **Coverage Tab**: Identify unused code

### Web Vitals

Monitor Core Web Vitals in production:

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Common Performance Issues

### 1. Large Bundle Size
**Solution**: Code splitting, tree shaking, lazy loading

### 2. Slow Initial Load
**Solution**: Optimize critical path, preload key resources

### 3. Excessive Re-renders
**Solution**: React.memo, useMemo, useCallback

### 4. Slow API Calls
**Solution**: Caching, request batching, pagination

### 5. Large Images
**Solution**: Compression, lazy loading, responsive images

## Best Practices

1. **Measure First**: Always measure before optimizing
2. **Focus on User Experience**: Optimize what users actually notice
3. **Progressive Enhancement**: Start with core functionality
4. **Monitor in Production**: Track real-world performance
5. **Regular Audits**: Run Lighthouse regularly

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Bundle Analysis Tools](https://bundlephobia.com/)
