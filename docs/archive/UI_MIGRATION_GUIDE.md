# UI Migration Guide: Unified Enterprise-Grade Design System

## Overview

This guide provides a complete migration path from v1 to v2 UI, establishing a **unified enterprise-grade design system** based on Apple's design principles with Material-UI components.

**Design Philosophy:**
- **Consistent** - Single source of truth for all UI patterns
- **Accessible** - WCAG 2.1 Level AA compliance
- **Responsive** - Mobile-first with graceful desktop scaling
- **Performant** - Optimized rendering and lazy loading
- **Themeable** - Full RTL support for Hebrew
- **Modern** - Apple-inspired aesthetics with smooth animations

---

## Table of Contents

1. [Design System Foundation](#design-system-foundation)
2. [Component Library](#component-library)
3. [Theme Configuration](#theme-configuration)
4. [Typography System](#typography-system)
5. [Color Palette](#color-palette)
6. [Spacing & Layout](#spacing--layout)
7. [Animation Guidelines](#animation-guidelines)
8. [Button Hierarchy](#button-hierarchy)
9. [Form Components](#form-components)
10. [Data Display Components](#data-display-components)
11. [Navigation Components](#navigation-components)
12. [Feedback Components](#feedback-components)
13. [RTL Support](#rtl-support)
14. [Accessibility Guidelines](#accessibility-guidelines)
15. [Migration Checklist](#migration-checklist)

---

## Design System Foundation

### File Structure

```
src/shared/presentation/
├── design-system/
│   ├── theme.ts              # MUI theme configuration
│   ├── colors.ts             # Color palette
│   ├── typography.ts         # Typography system
│   ├── spacing.ts            # Spacing scale
│   └── animations.ts         # Animation constants
├── components/
│   ├── atoms/                # Basic building blocks
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Label.tsx
│   │   └── Icon.tsx
│   ├── molecules/            # Composite components
│   │   ├── FormField.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Card.tsx
│   │   └── Chip.tsx
│   ├── organisms/            # Complex components
│   │   ├── DataTable.tsx
│   │   ├── Dialog.tsx
│   │   ├── AppBar.tsx
│   │   └── Drawer.tsx
│   └── templates/            # Page layouts
│       ├── MainLayout.tsx
│       └── DialogLayout.tsx
└── hooks/
    ├── useResponsive.ts      # Responsive breakpoint hook
    └── useTheme.ts           # Theme access hook
```

---

## Component Library

### Atomic Design Methodology

**Atoms** → **Molecules** → **Organisms** → **Templates** → **Pages**

#### Atoms (Smallest UI Elements)
- Button, Icon, Label, Input, Checkbox, Radio, Switch, Divider, Avatar, Badge, Chip

#### Molecules (Simple Component Groups)
- FormField (Label + Input + Error), SearchBar, Card, Alert, Tooltip, MenuItem

#### Organisms (Complex UI Sections)
- DataTable, Dialog, AppBar, NavigationDrawer, FilterPanel, FormSection

#### Templates (Page Layouts)
- MainLayout (with sidebar), DialogLayout, EmptyState

---

## Theme Configuration

### Base Theme Setup

**Location:** `src/shared/presentation/design-system/theme.ts`

```typescript
import { createTheme, ThemeOptions } from '@mui/material/styles';

export const createAppTheme = (direction: 'ltr' | 'rtl' = 'ltr') => {
  const themeOptions: ThemeOptions = {
    direction,
    
    // Breakpoints (Mobile-first)
    breakpoints: {
      values: {
        xs: 0,       // Phone (portrait)
        sm: 600,     // Phone (landscape)
        md: 960,     // Tablet
        lg: 1280,    // Desktop
        xl: 1920,    // Large desktop
      },
    },
    
    // Color palette
    palette: {
      primary: {
        main: '#007AFF',      // Apple blue
        light: '#5AC8FA',
        dark: '#0051D5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#5856D6',      // Apple purple
        light: '#AF52DE',
        dark: '#3634A3',
        contrastText: '#ffffff',
      },
      success: {
        main: '#34C759',      // Apple green
        light: '#30D158',
        dark: '#248A3D',
      },
      warning: {
        main: '#FF9500',      // Apple orange
        light: '#FFCC00',
        dark: '#C93400',
      },
      error: {
        main: '#FF3B30',      // Apple red
        light: '#FF6961',
        dark: '#D70015',
      },
      background: {
        default: '#F5F5F7',   // Gentle gray
        paper: '#FFFFFF',
      },
      text: {
        primary: '#3C3C3E',   // Dark gray
        secondary: '#86868B', // Medium gray
      },
      divider: 'rgba(0, 0, 0, 0.08)',
    },
    
    // Typography
    typography: {
      fontFamily: direction === 'rtl'
        ? '"Assistant", "Heebo", -apple-system, BlinkMacSystemFont, sans-serif'
        : '"Assistant", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h6: {
        fontSize: '1.05rem',
        fontWeight: 600,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.47,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
      },
      button: {
        fontSize: '0.9375rem',
        fontWeight: 500,
        textTransform: 'none',
      },
    },
    
    // Shape
    shape: {
      borderRadius: 12,
    },
    
    // Shadows (subtle, Apple-style)
    shadows: [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.06)',
      '0px 2px 6px rgba(0, 0, 0, 0.04), 0px 2px 4px rgba(0, 0, 0, 0.06)',
      '0px 3px 10px rgba(0, 0, 0, 0.04), 0px 3px 6px rgba(0, 0, 0, 0.06)',
      '0px 4px 14px rgba(0, 0, 0, 0.04), 0px 4px 8px rgba(0, 0, 0, 0.06)',
      '0px 6px 20px rgba(0, 0, 0, 0.04), 0px 6px 12px rgba(0, 0, 0, 0.06)',
      '0px 8px 26px rgba(0, 0, 0, 0.04), 0px 8px 16px rgba(0, 0, 0, 0.06)',
      '0px 12px 35px rgba(0, 0, 0, 0.04), 0px 12px 22px rgba(0, 0, 0, 0.06)',
      ...Array(17).fill('none'),
    ],
    
    // Component overrides (see below)
    components: { /* ... */ },
  };
  
  return createTheme(themeOptions);
};
```

---

## Typography System

### Font Families

**LTR (English):**
- Primary: "Assistant"
- Fallback: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif

**RTL (Hebrew):**
- Primary: "Assistant" (supports Hebrew)
- Fallback: "Heebo", -apple-system, BlinkMacSystemFont, Arial, sans-serif

### Typography Scale

| Variant | Size | Weight | Line Height | Use Case |
|---------|------|--------|-------------|----------|
| h1 | 2.5rem (40px) | 700 | 1.1 | Page titles |
| h2 | 2rem (32px) | 600 | 1.2 | Section titles |
| h3 | 1.75rem (28px) | 600 | 1.3 | Sub-section titles |
| h4 | 1.5rem (24px) | 600 | 1.3 | Card titles |
| h5 | 1.25rem (20px) | 600 | 1.4 | Dialog titles |
| h6 | 1.05rem (17px) | 600 | 1.4 | List headers |
| body1 | 1rem (16px) | 400 | 1.47 | Body text |
| body2 | 0.875rem (14px) | 400 | 1.43 | Secondary text |
| button | 0.9375rem (15px) | 500 | 1.2 | Buttons |
| caption | 0.75rem (12px) | 400 | 1.33 | Captions, hints |

### Usage Examples

```typescript
import { Typography } from '@mui/material';

// Page title
<Typography variant="h1">Personnel Management</Typography>

// Section title
<Typography variant="h2">Active Personnel</Typography>

// Card title
<Typography variant="h4">Dr. Smith</Typography>

// Body text
<Typography variant="body1">Primary information goes here</Typography>

// Secondary text
<Typography variant="body2" color="text.secondary">
  Last updated: 2 hours ago
</Typography>
```

---

## Color Palette

### Primary Colors

```typescript
const colors = {
  primary: {
    main: '#007AFF',      // Apple blue - primary actions
    light: '#5AC8FA',     // Light blue - hover states
    dark: '#0051D5',      // Dark blue - active states
  },
  secondary: {
    main: '#5856D6',      // Apple purple - secondary actions
    light: '#AF52DE',
    dark: '#3634A3',
  },
};
```

### Semantic Colors

```typescript
const semanticColors = {
  success: {
    main: '#34C759',      // Green - success states
    background: 'rgba(52, 199, 89, 0.1)',
  },
  warning: {
    main: '#FF9500',      // Orange - warnings
    background: 'rgba(255, 149, 0, 0.1)',
  },
  error: {
    main: '#FF3B30',      // Red - errors
    background: 'rgba(255, 59, 48, 0.1)',
  },
  info: {
    main: '#007AFF',      // Blue - information
    background: 'rgba(0, 122, 255, 0.1)',
  },
};
```

### Neutral Colors

```typescript
const neutralColors = {
  background: {
    default: '#F5F5F7',   // Page background
    paper: '#FFFFFF',      // Card background
  },
  text: {
    primary: '#3C3C3E',   // Primary text
    secondary: '#86868B', // Secondary text
    disabled: '#C7C7CC',  // Disabled text
  },
  divider: 'rgba(0, 0, 0, 0.08)',
};
```

### Usage Guidelines

**DO:**
- Use `primary.main` for primary CTAs (save, submit, confirm)
- Use `secondary.main` for outline/border buttons
- Use semantic colors for status indicators
- Use `text.secondary` for labels and hints

**DON'T:**
- Mix custom colors outside the palette
- Use hard-coded color values
- Ignore color contrast ratios (min 4.5:1 for text)

---

## Spacing & Layout

### Spacing Scale

Based on 8px grid system:

```typescript
const spacing = {
  xs: 4,      // Extra small
  sm: 8,      // Small
  md: 16,     // Medium (default)
  lg: 24,     // Large
  xl: 32,     // Extra large
  xxl: 48,    // Double extra large
};
```

### Usage in MUI

```typescript
// Using theme spacing function
<Box sx={{ p: 2 }}>          // padding: 16px
<Box sx={{ mt: 3 }}>          // margin-top: 24px
<Box sx={{ px: 1, py: 2 }}>  // paddingX: 8px, paddingY: 16px

// Gap in flex/grid
<Stack spacing={2}>           // gap: 16px
<Grid container spacing={3}>  // gap: 24px
```

### Layout Containers

```typescript
// Page container
<Container maxWidth="lg">     // max-width: 1280px

// Responsive padding
<Box sx={{
  px: { xs: 2, sm: 3, md: 4 },  // 16px → 24px → 32px
  py: { xs: 2, sm: 3 },
}}>
```

---

## Animation Guidelines

### Timing Functions

```typescript
const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',     // Most transitions
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',     // Enter animations
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',     // Exit animations
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',        // Abrupt transitions
};
```

### Duration Scale

```typescript
const duration = {
  shortest: 150,   // Icon transitions
  shorter: 200,    // Simple transitions
  short: 250,      // Default transitions
  standard: 300,   // Most transitions
  complex: 375,    // Complex transitions
  enteringScreen: 225,
  leavingScreen: 195,
};
```

### Animation Principles

1. **Purpose** - Every animation should have a purpose (feedback, hierarchy, continuity)
2. **Subtlety** - Prefer subtle over flashy (Apple style)
3. **Performance** - Use transform and opacity (GPU-accelerated)
4. **Consistency** - Same duration/easing for similar actions

### Common Patterns

```typescript
// Hover effect
transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
'&:hover': {
  transform: 'translateY(-1px)',
  boxShadow: elevation(4),
}

// Active/click effect
'&:active': {
  transform: 'scale(0.97)',
}

// Fade in
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
animation: fadeIn 0.3s ease;

// Slide up
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## Button Hierarchy

### Button Types

We have **3 distinct button styles** following a clear visual hierarchy:

#### **1. Primary Button (Contained) - Highest Emphasis**

```typescript
<Button variant="contained" color="primary">
  Save Changes
</Button>
```

**Visual Style:**
- **Background:** Animated gradient (`linear-gradient(135deg, #007AFF 0%, #6cc9ffd7 50%, #007AFF 100%)`)
- **Text:** White with subtle text shadow (`0 1px 3px rgba(0, 0, 0, 0.63)`)
- **Border Radius:** 10px
- **Padding:** 10px 20px
- **Min Height:** 44px
- **Font Weight:** 500
- **Box Shadow:** Elevated shadow on hover

**Interactions:**
- **Hover:** Gradient animates, slight elevation (`translateY(-1px)`)
- **Active:** Scale down effect (`scale(0.97)`)
- **Disabled:** Gray background (`rgba(0, 0, 0, 0.12)`), gray text

**Usage:**
- Primary CTAs (Save, Submit, Confirm)
- Main actions in dialogs
- Form submissions
- Critical user actions

---

#### **2. Secondary Button (Outline) - Medium Emphasis**

```typescript
<Button variant="outlined" color="primary">
  Cancel
</Button>
```

**Visual Style:**
- **Background:** Transparent
- **Border:** 2px solid `#007AFF` (blue)
- **Text:** `#007AFF` (blue)
- **Border Radius:** 10px
- **Padding:** 10px 20px
- **No shadow**

**Interactions:**
- **Hover:** Light blue background (`rgba(0, 122, 255, 0.04)`), darker border (`#0051D5`)
- **Active:** Scale down effect (`scale(0.97)`)
- **Disabled:** Gray background and text

**Usage:**
- Secondary actions (Cancel, Back)
- Destructive actions that need confirmation (Delete, Remove)
- Alternative options
- Actions paired with primary buttons

**Note:** In the current theme, `variant="contained" color="secondary"` is mapped to the outline style for consistency.

---

#### **3. Tertiary Button (Text Only) - Lowest Emphasis**

```typescript
<Button variant="text" color="primary">
  Learn More
</Button>
```

**Visual Style:**
- **Background:** Transparent (no background at all)
- **Border:** None
- **Text:** Colored text (uses `color` prop: primary blue, error red, etc.)
- **Font Weight:** 700 (bolder than other buttons)
- **Padding:** 0px (compact)
- **Min Height:** auto (more compact than other buttons)
- **Alignment:** `flex-start` (left-aligned)

**Interactions:**
- **Hover:** 
  - Background stays transparent (no background color)
  - Bottom border line animates in (`::after` pseudo-element)
  - Line: 2px solid, same color as text
  - Slight scale (`scale(1.02)`)
  - Animation: `scaleX(0)` → `scaleX(1.02)` from right to left
- **Active:** Scale effect
- **Disabled:** Transparent background, faded text

**Usage:**
- Links / navigation actions
- "View more", "Learn more", "See details" links
- Tertiary actions (low priority)
- Actions where space is limited
- Inline action links

**CSS Details (from theme.ts):**
```typescript
text: {
  background: 'transparent',
  fontWeight: 700,
  justifyContent: 'flex-start',
  padding: '0px',
  minHeight: 'auto',
  '&:hover': {
    backgroundColor: 'transparent !important',
    transform: 'scale(1.02)',
  },
  // Bottom line animation
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '100%',
    transform: 'scaleX(0)',
    height: '2px',
    bottom: '0px',
    left: 0,
    backgroundColor: 'currentColor',
    transformOrigin: 'bottom right',
    transition: 'transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1)',
  },
  '&:hover::after': {
    transform: 'scaleX(1.02)',
    transformOrigin: 'bottom left',
  },
}
```

### Button Sizes

```typescript
// Small
<Button size="small">Small</Button>      // padding: 6px 16px

// Medium (default)
<Button size="medium">Medium</Button>    // padding: 10px 20px

// Large
<Button size="large">Large</Button>      // padding: 12px 24px
```

### Button States

```typescript
// Disabled
<Button disabled>Disabled</Button>
// Background: rgba(0, 0, 0, 0.12)
// Text: rgba(0, 0, 0, 0.26)

// Loading
<Button disabled startIcon={<CircularProgress size={20} />}>
  Saving...
</Button>
```

### Icon Buttons

```typescript
<IconButton color="primary">
  <AddIcon />
</IconButton>

// With tooltip
<Tooltip title="Add Person">
  <IconButton color="primary">
    <AddIcon />
  </IconButton>
</Tooltip>
```

---

## Form Components

### Text Fields

```typescript
import { TextField } from '@mui/material';

// Standard text field
<TextField
  label="Full Name"
  variant="outlined"
  fullWidth
  required
/>

// With error
<TextField
  label="Email"
  error
  helperText="Please enter a valid email"
/>

// With validation
<TextField
  label="Phone"
  type="tel"
  inputProps={{ pattern: '[0-9]{3}-[0-9]{3}-[0-9]{4}' }}
/>
```

### Select / Dropdown

```typescript
<FormControl fullWidth>
  <InputLabel>Room</InputLabel>
  <Select value={room} onChange={handleChange}>
    <MenuItem value="room1">Room 1</MenuItem>
    <MenuItem value="room2">Room 2</MenuItem>
  </Select>
</FormControl>
```

### Checkboxes & Radio

```typescript
// Checkbox
<FormControlLabel
  control={<Checkbox checked={checked} />}
  label="Auto-save enabled"
/>

// Radio group
<RadioGroup value={value} onChange={handleChange}>
  <FormControlLabel value="room" control={<Radio />} label="Room" />
  <FormControlLabel value="chair" control={<Radio />} label="Chair" />
</RadioGroup>
```

### Form Layout Pattern

```typescript
<Box component="form" sx={{ mt: 3 }}>
  <Grid container spacing={2}>
    <Grid item xs={12} sm={6}>
      <TextField label="First Name" fullWidth required />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField label="Last Name" fullWidth required />
    </Grid>
    <Grid item xs={12}>
      <TextField label="Email" type="email" fullWidth required />
    </Grid>
  </Grid>
  
  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
    <Button variant="outlined" onClick={onCancel}>Cancel</Button>
    <Button variant="contained" type="submit">Save</Button>
  </Box>
</Box>
```

---

## Data Display Components

### Tables

```typescript
import { Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

<Paper>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
        <TableCell>Room</TableCell>
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {personnel.map((person) => (
        <TableRow key={person.id} hover>
          <TableCell>{person.name}</TableCell>
          <TableCell>{person.roomName}</TableCell>
          <TableCell align="right">
            <IconButton onClick={() => handleEdit(person)}>
              <EditIcon />
            </IconButton>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Paper>
```

### Cards

```typescript
<Card>
  <CardContent>
    <Typography variant="h5" component="div">
      Dr. John Smith
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Room 101 • Dentist
    </Typography>
  </CardContent>
  <CardActions>
    <Button size="small">Edit</Button>
    <Button size="small" color="error">Delete</Button>
  </CardActions>
</Card>
```

### Chips (Tags)

```typescript
<Chip label="Active" color="success" size="small" />
<Chip label="Occupied" color="error" size="small" />
<Chip label="Available" color="default" variant="outlined" />
```

---

## Navigation Components

### App Bar

```typescript
<AppBar position="sticky" color="default" elevation={0}>
  <Toolbar>
    <Typography variant="h6" sx={{ flexGrow: 1 }}>
      Dental Medical Center
    </Typography>
    <IconButton>
      <SettingsIcon />
    </IconButton>
  </Toolbar>
</AppBar>
```

### Tabs

```typescript
<Tabs value={value} onChange={handleChange}>
  <Tab label="Personnel" />
  <Tab label="Conference Rooms" />
  <Tab label="Settings" />
</Tabs>
```

### Breadcrumbs

```typescript
<Breadcrumbs>
  <Link href="/">Home</Link>
  <Link href="/personnel">Personnel</Link>
  <Typography color="text.primary">Edit</Typography>
</Breadcrumbs>
```

---

## Feedback Components

### Dialogs

```typescript
<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
  <DialogTitle>Add Person</DialogTitle>
  <DialogContent>
    <TextField label="Name" fullWidth sx={{ mt: 2 }} />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button variant="contained" onClick={handleSave}>Save</Button>
  </DialogActions>
</Dialog>
```

### Snackbars (Notifications)

```typescript
<Snackbar
  open={open}
  autoHideDuration={6000}
  onClose={handleClose}
  message="Person saved successfully"
/>

// With Alert
<Snackbar open={open} autoHideDuration={6000}>
  <Alert severity="success">
    Person saved successfully!
  </Alert>
</Snackbar>
```

### Progress Indicators

```typescript
// Circular
<CircularProgress />
<CircularProgress size={20} />

// Linear
<LinearProgress />
<LinearProgress variant="determinate" value={progress} />
```

---

## RTL Support

### Theme Configuration

```typescript
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// LTR cache
const cacheLtr = createCache({
  key: 'muiltr',
});

// In App.tsx
const cache = direction === 'rtl' ? cacheRtl : cacheLtr;

<CacheProvider value={cache}>
  <ThemeProvider theme={createAppTheme(direction)}>
    <App />
  </ThemeProvider>
</CacheProvider>
```

### RTL-Safe CSS

**Use logical properties:**
```typescript
// DON'T
marginLeft: 16,
paddingRight: 8,

// DO
marginInlineStart: 16,  // Left in LTR, Right in RTL
paddingInlineEnd: 8,     // Right in LTR, Left in RTL
```

### Component RTL Handling

```typescript
// Icon direction
<KeyboardArrowLeftIcon sx={{
  transform: (theme) => theme.direction === 'rtl' ? 'rotate(180deg)' : 'none'
}} />

// Text alignment
<Typography align={direction === 'rtl' ? 'right' : 'left'}>
```

---

## Accessibility Guidelines

### WCAG 2.1 Level AA Compliance

**1. Color Contrast**
- Text: minimum 4.5:1 ratio
- Large text (18px+): minimum 3:1 ratio
- Interactive elements: 3:1 ratio

**2. Keyboard Navigation**
```typescript
// Tab order
<Button tabIndex={0}>Primary</Button>
<Button tabIndex={1}>Secondary</Button>

// Focus visible
sx={{
  '&:focus-visible': {
    outline: '2px solid #007AFF',
    outlineOffset: 2,
  }
}}
```

**3. ARIA Labels**
```typescript
<IconButton aria-label="delete person">
  <DeleteIcon />
</IconButton>

<TextField
  aria-describedby="email-helper-text"
  helperText="Enter your business email"
/>
```

**4. Screen Reader Support**
```typescript
<Typography variant="h1" component="h1">
  Personnel Management
</Typography>

<img src="logo.png" alt="Company logo" />

<Button aria-label="Close dialog" onClick={handleClose}>
  <CloseIcon aria-hidden="true" />
</Button>
```

---

## Migration Checklist

### Phase 1: Foundation (Week 1)
- [ ] Copy theme.ts from v1 to `shared/presentation/design-system/`
- [ ] Extract colors, typography, spacing to separate files
- [ ] Setup RTL cache and provider
- [ ] Configure MUI theme with custom component styles
- [ ] Test theme in isolated environment

### Phase 2: Component Audits (Week 2)
- [ ] Audit all v1 components against design system
- [ ] Identify components that need refactoring
- [ ] Create new components following atomic design
- [ ] Document component APIs and usage

### Phase 3: Migration (Week 3-4)
- [ ] Migrate atoms (buttons, inputs, icons)
- [ ] Migrate molecules (form fields, cards, alerts)
- [ ] Migrate organisms (tables, dialogs, app bar)
- [ ] Migrate templates (layouts)
- [ ] Update all feature components to use new design system

### Phase 4: Polish (Week 5)
- [ ] Test all components in English
- [ ] Test all components in Hebrew (RTL)
- [ ] Verify color contrast ratios
- [ ] Test keyboard navigation
- [ ] Run accessibility audit
- [ ] Performance testing
- [ ] Documentation review

### Component Migration Map

| v1 Component | v2 Component | Status |
|--------------|--------------|--------|
| PersonnelManagement.tsx | Keep (refactor to use new buttons) | ✅ |
| PersonDialog.tsx | Keep (refactor form fields) | ✅ |
| PersonForm.tsx | Refactor with new TextField styles | ✅ |
| PersonnelTable.tsx | Keep (apply new table styles) | ✅ |
| ConferenceRoomList.tsx | Keep (refactor) | ✅ |
| SettingsDialog.tsx | Keep (refactor tabs) | ✅ |
| Header.tsx | Refactor with new AppBar | ✅ |
| MainLayout.tsx | Refactor with new layout system | ✅ |

---

## Summary

This UI migration guide provides:
- ✅ Complete design system foundation
- ✅ Apple-inspired enterprise-grade aesthetics
- ✅ Unified component library with clear hierarchy
- ✅ Full RTL support for Hebrew
- ✅ WCAG 2.1 Level AA accessibility
- ✅ Performance-optimized animations
- ✅ Comprehensive migration checklist

**Next Steps:**
1. Review and approve design system
2. Begin Phase 1 (Foundation setup)
3. Incrementally migrate components
4. Test and validate at each phase
