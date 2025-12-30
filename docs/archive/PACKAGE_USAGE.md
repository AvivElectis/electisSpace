# Package Usage Documentation

## Overview

This document provides a comprehensive guide to all packages used in DentalMedicalCenter v2, ensuring consistency with v1 while incorporating improvements where beneficial.

**Philosophy:** Use battle-tested, well-maintained packages with strong TypeScript support and active communities.

---

## Table of Contents

1. [Core Framework](#core-framework)
2. [State Management](#state-management)
3. [UI Framework](#ui-framework)
4. [Forms & Validation](#forms--validation)
5. [Internationalization](#internationalization)
6. [Data Processing](#data-processing)
7. [HTTP & API](#http--api)
8. [Utilities](#utilities)
9. [Platform Integration](#platform-integration)
10. [Development Tools](#development-tools)
11. [Testing](#testing)
12. [Build Tools](#build-tools)
13. [Package Comparison Table](#package-comparison-table)
14. [Migration Notes](#migration-notes)

---

## Core Framework

### React

**Package:** `react` + `react-dom`  
**Version:** v19.2.0 (latest)  
**Purpose:** Core UI framework

**Why:**
- Industry standard for building UIs
- Excellent TypeScript support
- Large ecosystem
- Hooks API for clean component logic

**Usage:**
```bash
npm install react@^19.2.0 react-dom@^19.2.0
```

```typescript
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// Functional components with hooks
function MyComponent() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}
```

**v1 → v2:** Keep (already using React 19)

---

## State Management

### Zustand

**Package:** `zustand`  
**Version:** ^5.0.8  
**Purpose:** Global state management

**Why:**
- Lightweight (< 1KB gzipped)
- Simple API, less boilerplate than Redux
- Built-in TypeScript support
- Middleware for persistence and devtools
- No context providers needed

**Usage:**
```bash
npm install zustand@^5.0.8
```

```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface Store {
  count: number;
  increment: () => void;
}

const useStore = create<Store>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
      { name: 'my-storage' }
    )
  )
);

// Use in components
const count = useStore((state) => state.count);
const increment = useStore((state) => state.increment);
```

**Alternatives Considered:**
- Redux Toolkit - Too heavy, more boilerplate
- Recoil - Less mature, larger bundle
- Jotai - Atomic approach may be overcomplicated

**v1 → v2:** Keep

---

## UI Framework

### Material-UI (MUI)

**Package:** `@mui/material` + `@emotion/react` + `@emotion/styled`  
**Version:** ^7.3.6  
**Purpose:** Component library and design system

**Why:**
- Comprehensive component library
- Excellent accessibility (ARIA support built-in)
- Themeable with full customization
- RTL support out of the box
- Active development and support

**Usage:**
```bash
npm install @mui/material@^7.3.6 @emotion/react@^11.14.0 @emotion/styled@^11.14.1
npm install @mui/icons-material@^7.3.5
```

```typescript
import { Button, TextField, Dialog } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';

const theme = createTheme({
  palette: {
    primary: { main: '#007AFF' },
  },
});

<ThemeProvider theme={theme}>
  <Button variant="contained" startIcon={<AddIcon />}>
    Add Person
  </Button>
</ThemeProvider>
```

**Key Packages:**
- `@mui/material` - Core components
- `@mui/icons-material` - Material icons
- `@emotion/react` - CSS-in-JS runtime
- `@emotion/styled` - Styled components API

**v1 → v2:** Keep (already using MUI 7)

---

### RTL Support

**Package:** `stylis-plugin-rtl`  
**Version:** ^2.1.1  
**Purpose:** Right-to-left CSS transformation

**Usage:**
```bash
npm install stylis-plugin-rtl@^2.1.1
```

```typescript
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});
```

**v1 → v2:** Keep

---

## Forms & Validation

### React Hook Form

**Package:** `react-hook-form`  
**Version:** ^7.66.0  
**Purpose:** Form state management and validation

**Why:**
- Minimal re-renders (uncontrolled components)
- Small bundle size (9KB)
- Excellent TypeScript support
- Built-in validation
- Integration with Zod for schema validation

**Usage:**
```bash
npm install react-hook-form@^7.66.0
```

```typescript
import { useForm } from 'react-hook-form';

interface FormData {
  name: string;
  email: string;
}

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  
  const onSubmit = (data: FormData) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: true })} />
      {errors.name && <span>Name is required</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

**v1 → v2:** Keep

---

### Zod

**Package:** `zod`  
**Version:** ^4.1.12  
**Purpose:** TypeScript-first schema validation

**Why:**
- Type inference (schemas generate TypeScript types)
- Composable schemas
- Comprehensive validation rules
- Excellent error messages
- Works seamlessly with React Hook Form

**Usage:**
```bash
npm install zod@^4.1.12
npm install @hookform/resolvers@^5.2.2
```

```typescript
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  age: z.number().min(18, "Must be 18 or older"),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

**Alternatives Considered:**
- Yup - Older, less TypeScript-friendly
- Joi - Server-side focused

**v1 → v2:** Keep

---

## Internationalization

### i18next + react-i18next

**Package:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`  
**Versions:** ^25.6.2, ^16.2.4, ^8.2.0  
**Purpose:** Multi-language support (English + Hebrew)

**Why:**
- Industry standard for i18n
- Namespace organization
- Lazy loading of translations
- Automatic language detection
- Interpolation and pluralization support

**Usage:**
```bash
npm install i18next@^25.6.2 react-i18next@^16.2.4 i18next-browser-languagedetector@^8.2.0
```

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: require('./locales/en/common.json'),
      },
      he: {
        common: require('./locales/he/common.json'),
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// In components
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation('common');
<h1>{t('personnel.title')}</h1>
i18n.changeLanguage('he');
```

**v1 → v2:** Keep

---

## Data Processing

### PapaParse

**Package:** `papaparse`  
**Version:** ^5.5.3  
**Purpose:** CSV parsing and generation

**Why:**
- Fast and reliable
- Handles large files
- Configurable delimiters
- Header row detection
- Type safety with TypeScript definitions

**Usage:**
```bash
npm install papaparse@^5.5.3
npm install -D @types/papaparse@^5.5.0
```

```typescript
import Papa from 'papaparse';

// Parse CSV
const result = Papa.parse(csvString, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
});
console.log(result.data); // Array of objects

// Generate CSV
const csv = Papa.unparse(data, {
  header: true,
  delimiter: ',',
});
```

**v1 → v2:** Keep

---

### crypto-js

**Package:** `crypto-js`  
**Version:** ^4.2.0  
**Purpose:** Encryption for sensitive data (credentials)

**Why:**
- AES-256 encryption support
- Simple API
- Compatible with browser and Node.js

**Usage:**
```bash
npm install crypto-js@^4.2.0
npm install -D @types/crypto-js@^4.2.2
```

```typescript
import CryptoJS from 'crypto-js';

// Encrypt
const encrypted = CryptoJS.AES.encrypt(plaintext, password).toString();

// Decrypt
const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);
```

**v1 → v2:** Keep

---

### date-fns

**Package:** `date-fns`  
**Version:** ^4.1.0  
**Purpose:** Date formatting and manipulation

**Why:**
- Modular (tree-shakeable)
- Immutable
- TypeScript support
- i18n support
- Smaller than Moment.js

**Usage:**
```bash
npm install date-fns@^4.1.0
```

```typescript
import { format, addDays, isAfter } from 'date-fns';

const formatted = format(new Date(), 'yyyy-MM-dd');
const tomorrow = addDays(new Date(), 1);
const isFuture = isAfter(tomorrow, new Date());
```

**v1 → v2:** Keep

---

### uuid

**Package:** `uuid`  
**Version:** ^13.0.0  
**Purpose:** Generate unique IDs

**Usage:**
```bash
npm install uuid@^13.0.0
npm install -D @types/uuid@^10.0.0
```

```typescript
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
```

**v1 → v2:** Keep

---

## HTTP & API

**Note:** No HTTP client needed for v2  
- SFTP: Uses custom API bridge (fetch API)
- SoluM: Direct REST API calls (fetch API)

**Native Fetch API:**
```typescript
// Example
const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
const result = await response.json();
```

**Why not Axios:**
- Fetch API is native (no extra package)
- TypeScript support built-in
- Smaller bundle size

**v1 → v2:** No package needed (use native fetch)

---

## Utilities

### JSZip

**Package:** `jszip`  
**Version:** ^3.10.1  
**Purpose:** Create/read ZIP files (for backups, exports)

**Usage:**
```bash
npm install jszip@^3.10.1
npm install -D @types/jszip@^3.4.0
```

```typescript
import JSZip from 'jszip';

const zip = new JSZip();
zip.file('settings.json', JSON.stringify(settings));
zip.file('data.csv', csvData);

const blob = await zip.generateAsync({ type: 'blob' });
// Download or save blob
```

**v1 → v2:** Keep

---

### vanilla-jsoneditor

**Package:** `vanilla-jsoneditor`  
**Version:** ^3.10.0  
**Purpose:** JSON editor component (for advanced users)

**Usage:**
```bash
npm install vanilla-jsoneditor@^3.10.0
```

```typescript
import { JSONEditor } from 'vanilla-jsoneditor';

const editor = new JSONEditor({
  target: document.getElementById('jsoneditor'),
  props: {
    content: { json: data },
    onChange: (updatedContent) => {
      console.log(updatedContent.json);
    },
  },
});
```

**v1 → v2:** Keep

---

## Platform Integration (Capacitor)

### Capacitor

**Packages:**
- `@capacitor/core` - Core platform APIs
- `@capacitor/cli` - Build and sync tools
- `@capacitor/android` - Android platform
- `@capacitor/filesystem` - File system access
- `@capacitor/device` - Device information
- `@capacitor/network` - Network status
- `@capacitor/preferences` - Persistent key-value storage

**Versions:** ^7.4.4

**Usage:**
```bash
npm install @capacitor/core@^7.4.4 @capacitor/cli@^7.4.4
npm install @capacitor/android@^7.4.4
npm install @capacitor/filesystem@^7.1.4 @capacitor/device@^7.0.2
npm install @capacitor/network@^7.0.2 @capacitor/preferences@^7.0.2
```

```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';

// Write file
await Filesystem.writeFile({
  path: 'settings.json',
  data: JSON.stringify(settings),
  directory: Directory.Documents,
});

// Get device info
const info = await Device.getInfo();
console.log(info.platform); // 'android' | 'ios' | 'web'
```

**v1 → v2:** Keep (if mobile support needed)

---

## Development Tools

### TypeScript

**Package:** `typescript`  
**Version:** ~5.9.3  
**Purpose:** Type safety and better DX

**Config:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "paths": {
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

**v1 → v2:** Keep

---

### ESLint

**Package:** `eslint` + plugins  
**Version:** ^9.39.1  
**Purpose:** Code linting

**Plugins:**
- `@eslint/js` - Core rules
- `typescript-eslint` - TypeScript rules
- `eslint-plugin-react-hooks` - React hooks rules
- `eslint-plugin-react-refresh` - Vite HMR rules

```bash
npm install -D eslint@^9.39.1 @eslint/js@^9.39.1
npm install -D typescript-eslint@^8.46.3
npm install -D eslint-plugin-react-hooks@^5.2.0
npm install -D eslint-plugin-react-refresh@^0.4.24
```

**v1 → v2:** Keep

---

### Prettier

**Package:** `prettier`  
**Version:** ^3.7.4  
**Purpose:** Code formatting

**Config:** `.prettierrc`
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

```bash
npm install -D prettier@^3.7.4
```

**v1 → v2:** Keep

---

### Husky + lint-staged

**Packages:** `husky` + `lint-staged`  
**Versions:** ^9.1.7 + ^16.2.7  
**Purpose:** Pre-commit hooks

**Usage:**
```bash
npm install -D husky@^9.1.7 lint-staged@^16.2.7
npx husky init
```

**package.json:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

**v1 → v2:** Keep

---

## Testing

### Vitest

**Package:** `vitest`  
**Version:** ^4.0.15  
**Purpose:** Unit and integration testing (Vite-native)

**Why:**
- Fast (uses Vite's transform pipeline)
- Jest-compatible API
- Built-in TypeScript support
- Watch mode

**Usage:**
```bash
npm install -D vitest@^4.0.15 jsdom@^27.3.0
```

```typescript
import { describe, it, expect } from 'vitest';

describe('validatePerson', () => {
  it('should validate required fields', () => {
    const result = validatePerson(person, csvConfig);
    expect(result.valid).toBe(true);
  });
});
```

**v1 → v2:** Keep

---

### React Testing Library

**Package:** `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event`  
**Purpose:** Component testing

**Usage:**
```bash
npm install -D @testing-library/react@^16.3.0
npm install -D @testing-library/jest-dom@^6.9.1
npm install -D @testing-library/user-event@^14.6.1
```

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('button click increments counter', async () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /increment/i });
  await userEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

**v1 → v2:** Keep

---

## Build Tools

### Vite

**Package:** `rolldown-vite` (alias for Vite with Rolldown bundler)  
**Version:** 7.2.2  
**Purpose:** Build tool and dev server

**Why:**
- Lightning-fast HMR
- ESBuild for dependencies
- Rollup for production builds
- Plugin ecosystem
- Native TypeScript support

**Plugins:**
- `@vitejs/plugin-react` - React support with Fast Refresh
- `@vitejs/plugin-basic-ssl` - HTTPS for local dev (needed for Capacitor)

```bash
npm install -D vite@npm:rolldown-vite@7.2.2
npm install -D @vitejs/plugin-react@^5.1.0
npm install -D @vitejs/plugin-basic-ssl@^2.1.0
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@features': '/src/features',
      '@shared': '/src/shared',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
});
```

**v1 → v2:** Keep

---

## Package Comparison Table

| Category | Package | v1 Version | v2 Version | Change | Notes |
|----------|---------|-----------|-----------|--------|-------|
| **Core** |||||| 
| React | react | ^19.2.0 | ^19.2.0 | ✅ Keep | Latest stable |
| React DOM | react-dom | ^19.2.0 | ^19.2.0 | ✅ Keep | |
| **State** |||||| 
| State Management | zustand | ^5.0.8 | ^5.0.8 | ✅ Keep | Simple, performant |
| **UI** |||||| 
| Component Library | @mui/material | ^7.3.6 | ^7.3.6 | ✅ Keep | Latest MUI |
| Icons | @mui/icons-material | ^7.3.5 | ^7.3.5 | ✅ Keep | |
| CSS-in-JS | @emotion/react | ^11.14.0 | ^11.14.0 | ✅ Keep | MUI dependency |
| Styled Components | @emotion/styled | ^11.14.1 | ^11.14.1 | ✅ Keep | |
| RTL Plugin | stylis-plugin-rtl | ^2.1.1 | ^2.1.1 | ✅ Keep | Hebrew support |
| **Forms** |||||| 
| Form Management | react-hook-form | ^7.66.0 | ^7.66.0 | ✅ Keep | Best performance |
| Validation | zod | ^4.1.12 | ^4.1.12 | ✅ Keep | Type-safe |
| RHF Resolver | @hookform/resolvers | ^5.2.2 | ^5.2.2 | ✅ Keep | Zod integration |
| **i18n** |||||| 
| Internationalization | i18next | ^25.6.2 | ^25.6.2 | ✅ Keep | |
| React Integration | react-i18next | ^16.2.4 | ^16.2.4 | ✅ Keep | |
| Language Detection | i18next-browser-languagedetector | ^8.2.0 | ^8.2.0 | ✅ Keep | |
| **Data** |||||| 
| CSV Parsing | papaparse | ^5.5.3 | ^5.5.3 | ✅ Keep | Best CSV library |
| Encryption | crypto-js | ^4.2.0 | ^4.2.0 | ✅ Keep | Credentials  |
| Date Utils | date-fns | ^4.1.0 | ^4.1.0 | ✅ Keep | Lightweight |
| UUID | uuid | ^13.0.0 | ^13.0.0 | ✅ Keep | |
| **Utils** |||||| 
| ZIP Files | jszip | ^3.10.1 | ^3.10.1 | ✅ Keep | Backups |
| JSON Editor | vanilla-jsoneditor | ^3.10.0 | ^3.10.0 | ✅ Keep | Advanced users |
| **Platform** |||||| 
| Capacitor Core | @capacitor/core | ^7.4.4 | ^7.4.4 | ✅ Keep | Mobile support |
| Capacitor CLI | @capacitor/cli | ^7.4.4 | ^7.4.4 | ✅ Keep | |
| Android Platform | @capacitor/android | ^7.4.4 | ^7.4.4 | ✅ Keep | |
| Filesystem API | @capacitor/filesystem | ^7.1.4 | ✅ Keep | File access |
| Device API | @capacitor/device | ^7.0.2 | ^7.0.2 | ✅ Keep | Platform detect |
| **Dev Tools** |||||| 
| TypeScript | typescript | ~5.9.3 | ~5.9.3 | ✅ Keep | |
| Build Tool | vite (rolldown) | 7.2.2 | 7.2.2 | ✅ Keep | Fast builds |
| React Plugin | @vitejs/plugin-react | ^5.1.0 | ^5.1.0 | ✅ Keep | HMR |
| Linter | eslint | ^9.39.1 | ^9.39.1 | ✅ Keep | |
| Formatter | prettier | ^3.7.4 | ^3.7.4 | ✅ Keep | |
| Git Hooks | husky | ^9.1.7 | ^9.1.7 | ✅ Keep | Pre-commit |
| Staged Files | lint-staged | ^16.2.7 | ^16.2.7 | ✅ Keep | |
| **Testing** |||||| 
| Test Runner | vitest | ^4.0.15 | ^4.0.15 | ✅ Keep | Vite-native |
| DOM Testing | jsdom | ^27.3.0 | ^27.3.0 | ✅ Keep | |
| React Testing | @testing-library/react | ^16.3.0 | ^16.3.0 | ✅ Keep | |
| Jest DOM | @testing-library/jest-dom | ^6.9.1 | ^6.9.1 | ✅ Keep | |
| User Events | @testing-library/user-event | ^14.6.1 | ^14.6.1 | ✅ Keep | |

**Summary:** ✅ **All packages from v1 are kept in v2** - no changes needed!

---

## Migration Notes

### No Changes Required

**Good News:** v1 already uses optimal packages. v2 will use the exact same versions.

### Installation Script for v2

```bash
# Core
npm install react@^19.2.0 react-dom@^19.2.0

# State Management
npm install zustand@^5.0.8

# UI Framework
npm install @mui/material@^7.3.6 @emotion/react@^11.14.0 @emotion/styled@^11.14.1
npm install @mui/icons-material@^7.3.5

# Forms & Validation
npm install react-hook-form@^7.66.0 zod@^4.1.12 @hookform/resolvers@^5.2.2

# i18n
npm install i18next@^25.6.2 react-i18next@^16.2.4 i18next-browser-languagedetector@^8.2.0

# Data Processing
npm install papaparse@^5.5.3 crypto-js@^4.2.0 date-fns@^4.1.0 uuid@^13.0.0

# Utilities
npm install jszip@^3.10.1 vanilla-jsoneditor@^3.10.0

# Platform (if mobile support)
npm install @capacitor/core@^7.4.4 @capacitor/cli@^7.4.4 @capacitor/android@^7.4.4
npm install @capacitor/filesystem@^7.1.4 @capacitor/device@^7.0.2 @capacitor/network@^7.0.2 @capacitor/preferences@^7.0.2

# Dev Dependencies
npm install -D typescript@~5.9.3
npm install -D vite@npm:rolldown-vite@7.2.2 @vitejs/plugin-react@^5.1.0 @vitejs/plugin-basic-ssl@^2.1.0
npm install -D eslint@^9.39.1 @eslint/js@^9.39.1 typescript-eslint@^8.46.3
npm install -D eslint-plugin-react-hooks@^5.2.0 eslint-plugin-react-refresh@^0.4.24
npm install -D prettier@^3.7.4
npm install -D husky@^9.1.7 lint-staged@^16.2.7
npm install -D vitest@^4.0.15 jsdom@^27.3.0
npm install -D @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.9.1 @testing-library/user-event@^14.6.1

# Type Definitions
npm install -D @types/react@^19.2.2 @types/react-dom@^19.2.2
npm install -D @types/papaparse@^5.5.0 @types/crypto-js@^4.2.2 @types/uuid@^10.0.0 @types/jszip@^3.4.0
npm install -D @types/node@^24.10.0

# RTL Support
npm install stylis-plugin-rtl@^2.1.1 @types/stylis@^4.2.7
```

### package.json Template

```json
{
  "name": "dental-medical-center-v2",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint .",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "prepare": "husky"
  },
  "dependencies": {
    "@capacitor/android": "^7.4.4",
    "@capacitor/cli": "^7.4.4",
    "@capacitor/core": "^7.4.4",
    "@capacitor/device": "^7.0.2",
    "@capacitor/filesystem": "^7.1.4",
    "@capacitor/network": "^7.0.2",
    "@capacitor/preferences": "^7.0.2",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@hookform/resolvers": "^5.2.2",
    "@mui/icons-material": "^7.3.5",
    "@mui/material": "^7.3.6",
    "crypto-js": "^4.2.0",
    "date-fns": "^4.1.0",
    "i18next": "^25.6.2",
    "i18next-browser-languagedetector": "^8.2.0",
    "jszip": "^3.10.1",
    "papaparse": "^5.5.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-hook-form": "^7.66.0",
    "react-i18next": "^16.2.4",
    "uuid": "^13.0.0",
    "vanilla-jsoneditor": "^3.10.0",
    "zod": "^4.1.12",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/crypto-js": "^4.2.2",
    "@types/jszip": "^3.4.0",
    "@types/node": "^24.10.0",
    "@types/papaparse": "^5.5.0",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "@types/stylis": "^4.2.7",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-basic-ssl": "^2.1.0",
    "@vitejs/plugin-react": "^5.1.0",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "husky": "^9.1.7",
    "jsdom": "^27.3.0",
    "lint-staged": "^16.2.7",
    "prettier": "^3.7.4",
    "stylis-plugin-rtl": "^2.1.1",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.46.3",
    "vite": "npm:rolldown-vite@7.2.2",
    "vitest": "^4.0.15"
  }
}
```

---

## Summary

**Key Takeaways:**
- ✅ v1 packages are already optimal
- ✅ No package changes needed for v2
- ✅ All packages have strong TypeScript support
- ✅ Modern, actively maintained libraries
- ✅ Small bundle sizes (performance-first)
- ✅ Proven stability in production

**Next Steps:**
1. Copy `package.json` dependencies from v1 to v2
2. Run `npm install`
3. Copy configuration files (tsconfig, vite.config, eslint.config)
4. Begin implementation following architecture docs
