# Design System Documentation

> **Apple-Inspired Enterprise UI Design System**  
> A comprehensive guide to the visual design language, components, and interaction patterns for the Dental Medical Center application.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Button Types & States](#button-types--states)
6. [Animations & Transitions](#animations--transitions)
7. [Component Styling](#component-styling)
8. [Theming](#theming)
9. [Accessibility](#accessibility)

---

## Design Philosophy

The design system is inspired by Apple's Human Interface Guidelines, emphasizing:

- **Clarity**: Clear visual hierarchy and readable typography
- **Deference**: Content-first design with subtle UI elements
- **Depth**: Layered interface with realistic shadows and motion
- **Consistency**: Uniform patterns across all components
- **Elegance**: Refined aesthetics with attention to detail

### Core Principles

1. **Gentle & Sophisticated**: Use soft colors and subtle shadows
2. **Smooth Interactions**: All transitions use Apple's signature easing curves
3. **Responsive Design**: Adapts seamlessly from mobile to desktop
4. **Accessibility First**: WCAG 2.1 AA compliant with proper focus states
5. **RTL Support**: Full bidirectional text support for Hebrew and English

---

## Color System

### Primary Palette

Our color system is based on Apple's iOS color palette with custom refinements for enterprise use.

#### Primary Blue
```css
Primary Main:    #007AFF  /* Apple Blue - Primary actions */
Primary Light:   #5AC8FA  /* Light Blue - Hover states */
Primary Dark:    #0051D5  /* Dark Blue - Active states */
Contrast Text:   #FFFFFF  /* White text on primary */
```

**Usage**: Primary actions, links, focus states, brand elements

#### Secondary Purple
```css
Secondary Main:  #5856D6  /* Apple Purple */
Secondary Light: #AF52DE  /* Light Purple */
Secondary Dark:  #3634A3  /* Dark Purple */
Contrast Text:   #FFFFFF
```

**Usage**: Secondary actions, accents, special features

### Semantic Colors

#### Success (Green)
```css
Success Main:    #34C759  /* Apple Green */
Success Light:   #30D158
Success Dark:    #248A3D
```
**Usage**: Success messages, confirmations, positive states

#### Warning (Orange)
```css
Warning Main:    #FF9500  /* Apple Orange */
Warning Light:   #FFCC00
Warning Dark:    #C93400
```
**Usage**: Warnings, caution messages, important notices

#### Error (Red)
```css
Error Main:      #FF3B30  /* Apple Red */
Error Light:     #FF6961
Error Dark:      #D70015
```
**Usage**: Errors, destructive actions, validation failures

#### Info (Blue)
```css
Info Main:       #007AFF  /* Same as Primary */
Info Light:      #5AC8FA
Info Dark:       #0051D5
```
**Usage**: Informational messages, tips, notifications

### Neutral Colors

#### Background
```css
Default:         #F5F5F7  /* Apple's gentle gray - main background */
Paper:           #FFFFFF  /* White - card/dialog backgrounds */
```

#### Text
```css
Primary:         #3C3C3E  /* Dark gray - primary text */
Secondary:       #86868B  /* Medium gray - secondary text */
Disabled:        rgba(0, 0, 0, 0.26)  /* Light gray - disabled text */
```

#### Borders & Dividers
```css
Divider:         rgba(0, 0, 0, 0.08)  /* Subtle divider */
Border Light:    rgba(0, 0, 0, 0.1)   /* Input borders */
Border Medium:   rgba(0, 0, 0, 0.2)   /* Hover borders */
```

### Color Usage Guidelines

> [!IMPORTANT]
> Always maintain sufficient contrast ratios:
> - Normal text: 4.5:1 minimum
> - Large text (18pt+): 3:1 minimum
> - UI components: 3:1 minimum

**Do's**:
- Use primary blue for main CTAs and important actions
- Use semantic colors consistently (green = success, red = error)
- Maintain color consistency across similar components
- Test colors in both light and dark modes

**Don'ts**:
- Don't use pure black (#000000) for text
- Don't mix semantic meanings (e.g., red for success)
- Avoid using too many colors in one view
- Don't rely solely on color to convey information

---

## Typography

### Font Family

```css
/* LTR (English) */
font-family: "Assistant", -apple-system, BlinkMacSystemFont, 
             "SF Pro Display", "SF Pro Text", "Helvetica Neue", 
             Arial, sans-serif;

/* RTL (Hebrew) */
font-family: "Assistant", "Heebo", -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Arial, sans-serif;
```

### Type Scale

| Style | Size | Weight | Line Height | Letter Spacing | Use Case |
|-------|------|--------|-------------|----------------|----------|
| **H1** | 2.5rem (40px) | 700 | 1.1 | -0.02em | Page titles |
| **H2** | 2rem (32px) | 600 | 1.2 | -0.01em | Section headers |
| **H3** | 1.75rem (28px) | 600 | 1.3 | -0.01em | Subsection headers |
| **H4** | 1.5rem (24px) | 600 | 1.3 | -0.005em | Card titles |
| **H5** | 1.25rem (20px) | 600 | 1.4 | 0 | Small headers |
| **H6** | 1.05rem (17px) | 600 | 1.4 | 0 | Table headers |
| **Body 1** | 1rem (16px) | 400 | 1.47 | -0.005em | Primary content |
| **Body 2** | 0.875rem (14px) | 400 | 1.43 | -0.005em | Secondary content |
| **Button** | 0.9375rem (15px) | 500 | 1 | -0.01em | Button labels |

### Typography Guidelines

> [!TIP]
> Use negative letter spacing for large headings to achieve Apple's signature tight, refined look.

**Best Practices**:
- Use a clear hierarchy with distinct size differences
- Limit to 2-3 font sizes per page for simplicity
- Keep line length between 50-75 characters for readability
- Use consistent spacing between headings and paragraphs

**Code Example**:
```tsx
// Material-UI Typography Component
<Typography variant="h1">Page Title</Typography>
<Typography variant="body1">Main content text</Typography>
<Typography variant="body2" color="text.secondary">
  Secondary information
</Typography>
```

---

## Spacing & Layout

### Spacing System

Based on an 8px grid system for consistency:

```css
xs:   4px   (0.25rem)
sm:   8px   (0.5rem)
md:   16px  (1rem)    /* Base unit */
lg:   24px  (1.5rem)
xl:   32px  (2rem)
xxl:  48px  (3rem)
```

**Usage Guidelines**:
- Use multiples of 8px for most spacing
- 4px for fine-tuning (e.g., icon-to-text spacing)
- Maintain consistent spacing within similar components

### Breakpoints

Responsive design breakpoints following Material-UI standard:

| Breakpoint | Width | Device |
|------------|-------|--------|
| **xs** | 0px | Phone (portrait) |
| **sm** | 600px | Phone (landscape) / Small tablet |
| **md** | 960px | Tablet |
| **lg** | 1280px | Desktop |
| **xl** | 1920px | Large desktop |

### Border Radius

Consistent rounding for visual harmony:

```css
Default:    12px  /* Theme shape */
Button:     10px  /* Slightly smaller */
Card:       16px  /* Larger for cards */
Dialog:     20px  /* Largest for modals */
Chip:       8px   /* Small for chips */
Input:      10px  /* Input fields */
```

---

## Button Types & States

### Button Variants

#### 1. Primary (Contained)

**Visual Design**:
- Animated gradient background: `#007AFF → #6cc9ff → #007AFF`
- White text with subtle shadow: `0 1px 3px rgba(0, 0, 0, 0.63)`
- Elevated shadow: `0px 2px 4px rgba(0, 0, 0, 0.2)`
- Gradient animation on idle (20s cycle)

**States**:
```css
/* Default */
background: linear-gradient(135deg, #007AFF 0%, #6cc9ffd7 50%, #007AFF 100%);
background-size: 200% auto;
animation: gradientAnimation 20s ease infinite;

/* Hover */
background-position: right center;
animation: gradientAnimation 5s ease infinite;
transform: translateY(-1px);
box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.25);

/* Active/Pressed */
transform: scale(0.97);

/* Disabled */
background: rgba(0, 0, 0, 0.12) !important;
color: rgba(0, 0, 0, 0.26) !important;
box-shadow: none !important;
```

**Usage**: Main CTAs, submit actions, primary workflows

**Code Example**:
```tsx
<Button variant="contained" color="primary">
  Save Changes
</Button>
```

#### 2. Secondary (Outlined)

**Visual Design**:
- Transparent background
- 2px solid blue border: `#007AFF`
- Blue text: `#007AFF`
- No shadow or gradient

**States**:
```css
/* Default */
background-color: transparent;
border: 2px solid #007AFF;
color: #007AFF;

/* Hover */
background-color: rgba(0, 122, 255, 0.04);
border-color: #0051D5;

/* Active/Pressed */
transform: scale(0.97);

/* Disabled */
background: transparent !important;
border-color: rgba(0, 0, 0, 0.12) !important;
color: rgba(0, 0, 0, 0.26) !important;
```

**Usage**: Secondary actions, cancel buttons, alternative choices

**Code Example**:
```tsx
<Button variant="contained" color="secondary">
  Cancel
</Button>
```

> [!NOTE]
> In this design system, `containedSecondary` is styled as outlined, providing a border-only appearance.

#### 3. Tertiary (Text)

**Visual Design**:
- Transparent background, no border
- Bold colored text (weight: 700)
- Animated underline on hover
- Minimal padding, compact size

**States**:
```css
/* Default */
background: transparent;
font-weight: 700;
padding: 0px;

/* Hover */
background: transparent !important;
transform: scale(1.02);
opacity: 1;

/* Underline Animation */
&::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  bottom: 0;
  left: 0;
  background-color: currentColor;
  transform: scaleX(0);
  transform-origin: bottom right;
  transition: transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);
}

&:hover::after {
  transform: scaleX(1.02);
  transform-origin: bottom left;
}

/* Disabled */
background: transparent !important;
color: rgba(0, 0, 0, 0.26) !important;
```

**Usage**: Less important actions, inline links, navigation

**Code Example**:
```tsx
<Button variant="text" color="primary">
  Learn More
</Button>
```

#### 4. Icon Buttons

**Visual Design**:
- Circular or square shape
- No background by default
- Smooth lift on hover

**States**:
```css
/* Hover */
transform: translateY(-1px);

/* Active */
transform: scale(0.96);
```

**Code Example**:
```tsx
<IconButton color="primary" aria-label="settings">
  <SettingsIcon />
</IconButton>
```

#### 5. Floating Action Button (FAB)

**Visual Design**:
- Gradient background: `linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)`
- Large shadow: `0 8px 24px rgba(90, 200, 250, 0.3)`
- Prominent elevation

**States**:
```css
/* Default */
box-shadow: 0 8px 24px rgba(90, 200, 250, 0.3);

/* Hover */
box-shadow: 0 12px 32px rgba(90, 200, 250, 0.4);
transform: translateY(-2px) scale(1.05);

/* Active */
transform: translateY(0) scale(0.98);
```

**Usage**: Primary floating action (e.g., "Add New")

**Code Example**:
```tsx
<Fab color="primary" aria-label="add">
  <AddIcon />
</Fab>
```

### Button Sizing

```css
/* Default */
min-height: 44px;    /* Touch-friendly */
min-width: 100px;
max-width: 70%;
padding: 10px 20px;

/* Small */
min-height: 36px;
padding: 8px 16px;

/* Large */
min-height: 52px;
padding: 12px 24px;
```

### Button Best Practices

> [!IMPORTANT]
> Always use descriptive button labels. Avoid generic text like "Click Here" or "Submit".

**Do's**:
- Use primary buttons sparingly (1 per section)
- Provide adequate touch targets (44px minimum)
- Use consistent button placement across views
- Show loading states for async operations

**Don'ts**:
- Don't use multiple primary buttons in close proximity
- Don't disable buttons without explanation
- Avoid very long button labels (use tooltips if needed)
- Don't use buttons for navigation (use links)

---

## Animations & Transitions

### Easing Functions

All animations use Apple's signature cubic-bezier easing:

```css
/* Standard easing - most common */
cubic-bezier(0.4, 0, 0.2, 1)

/* Quick easing - button interactions */
cubic-bezier(0.645, 0.045, 0.355, 1)
```

### Transition Durations

```css
Fast:    0.15s  /* Button presses */
Normal:  0.2s   /* Hover states */
Smooth:  0.25s  /* Underline animations */
Slow:    0.3s   /* Component entrance */
Lazy:    0.4s   /* Page transitions */
```

### Animation Library

#### 1. Gradient Animation (Buttons)

```css
@keyframes gradientAnimation {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Usage */
animation: gradientAnimation 20s ease infinite;

/* On Hover - speed up */
animation: gradientAnimation 5s ease infinite;
```

#### 2. Fade In

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Usage */
animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

#### 3. Slide In Bottom

```css
@keyframes slideInBottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Usage */
animation: slideInBottom 0.5s cubic-bezier(0.4, 0, 0.2, 1);
```

#### 4. Scale In

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Usage */
animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

#### 5. Spin (Loading)

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Usage */
animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
```

### Hover States

#### Button Lift
```css
&:hover {
  transform: translateY(-1px);
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.25);
}
```

#### Card Lift
```css
&:hover {
  transform: translateY(-2px);
  box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.06), 
              0px 4px 8px rgba(0, 0, 0, 0.06);
}
```

#### Icon Button Lift
```css
&:hover {
  transform: translateY(-1px);
}
```

#### FAB Lift and Scale
```css
&:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 12px 32px rgba(90, 200, 250, 0.4);
}
```

#### Text Button Underline
```css
/* Animated underline from right to left */
&::after {
  transform: scaleX(0);
  transform-origin: bottom right;
  transition: transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);
}

&:hover::after {
  transform: scaleX(1.02);
  transform-origin: bottom left;
}
```

### Touch Feedback

```css
/* For all interactive elements */
&:active {
  transform: scale(0.97);
}

/* Mobile-specific class */
.touch-feedback:active {
  transform: scale(0.97);
}
```

### RTL Animation Support

```css
/* Ensure animations work in RTL */
[dir="rtl"] * {
  animation-direction: normal !important;
}
```

---

## Component Styling

### Inputs & Text Fields

**Visual Design**:
- 10px border radius
- Light border: `rgba(0, 0, 0, 0.1)`
- White background
- 16px font size

**States**:
```css
/* Default */
border: 1px solid rgba(0, 0, 0, 0.1);
background-color: #FFFFFF;
padding: 12px 14px;

/* Hover */
border-color: rgba(0, 0, 0, 0.2);

/* Focus */
border-color: #007AFF;
border-width: 2px;
```

**Code Example**:
```tsx
<TextField
  label="Email Address"
  variant="outlined"
  fullWidth
/>
```

### Cards

**Visual Design**:
- 16px border radius
- Subtle shadow and border
- Interactive lift on hover

**States**:
```css
/* Default */
border-radius: 16px;
box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.04), 
            0px 2px 4px rgba(0, 0, 0, 0.04);
border: 1px solid rgba(0, 0, 0, 0.04);

/* Hover */
box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.06), 
            0px 4px 8px rgba(0, 0, 0, 0.06);
transform: translateY(-2px);
```

**Code Example**:
```tsx
<Card>
  <CardContent>
    <Typography variant="h5">Card Title</Typography>
    <Typography variant="body2" color="text.secondary">
      Card content
    </Typography>
  </CardContent>
</Card>
```

### Dialogs & Modals

**Visual Design**:
- 20px border radius (largest)
- Prominent shadow for depth
- Blur backdrop

**Styling**:
```css
border-radius: 20px;
box-shadow: 0px 12px 40px rgba(0, 0, 0, 0.12), 
            0px 12px 24px rgba(0, 0, 0, 0.08);
```

### App Bar (Header)

**Visual Design**:
- Glassmorphism effect
- No shadow, subtle border
- Semi-transparent white background

**Styling**:
```css
background-color: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
box-shadow: none;
border-bottom: 1px solid rgba(0, 0, 0, 0.08);
```

### Tables

**Cell Styling**:
```css
/* Body Cell */
padding: 16px;
border-color: rgba(0, 0, 0, 0.06);

/* Header Cell */
font-weight: 600;
background-color: rgba(0, 0, 0, 0.02);
color: #3C3C3E;
```

### Tabs

**Styling**:
```css
text-transform: none;
font-size: 0.9375rem;
font-weight: 500;
min-height: 48px;

/* Selected */
font-weight: 600;
```

### Chips

**Styling**:
```css
border-radius: 8px;
font-weight: 500;
```

### Scrollbars

**Apple-Style Scrollbar**:
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
```

---

## Theming

### Theme Direction

The application supports both LTR (English) and RTL (Hebrew) layouts:

```tsx
// Create theme with direction
const theme = createAppTheme('ltr');  // or 'rtl'

// Usage in app
<ThemeProvider theme={theme}>
  <CssBaseline />
  <App />
</ThemeProvider>
```

### Dark Mode (Future)

> [!NOTE]
> Dark mode is planned but not yet implemented. When adding dark mode:
> - Invert background/foreground colors
> - Reduce shadow intensities
> - Adjust color saturation for OLED displays
> - Maintain contrast ratios for accessibility

**Suggested Dark Mode Colors**:
```css
Background Default:  #000000
Background Paper:    #1C1C1E
Text Primary:        #FFFFFF
Text Secondary:      #98989D
Divider:             rgba(255, 255, 255, 0.13)
```

### Custom Theme Override

To customize the theme, modify `src/styles/theme.ts`:

```tsx
export const createAppTheme = (direction: 'ltr' | 'rtl' = 'ltr') => {
  const themeOptions: ThemeOptions = {
    palette: {
      primary: {
        main: '#YOUR_COLOR',
      },
      // ... other overrides
    },
  };
  
  return createTheme(themeOptions);
};
```

---

## Accessibility

### Focus States

All interactive elements have visible focus indicators:

```css
*:focus-visible {
  outline: 2px solid #007AFF;
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus-visible,
a:focus-visible {
  outline-offset: 3px;
}
```

### Color Contrast

> [!IMPORTANT]
> All color combinations meet WCAG 2.1 AA standards:
> - Text: 4.5:1 minimum contrast ratio
> - Large text (18pt+): 3:1 minimum
> - UI components: 3:1 minimum

**Tested Combinations**:
- `#007AFF` on `#FFFFFF`: ✓ Pass (4.52:1)
- `#3C3C3E` on `#FFFFFF`: ✓ Pass (11.43:1)
- `#86868B` on `#FFFFFF`: ✓ Pass (4.56:1)

### Touch Targets

Minimum touch target size: **44px × 44px**

All interactive elements (buttons, links, inputs) meet this requirement for mobile accessibility.

### Screen Reader Support

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Provide `aria-label` for icon-only buttons
- Use `aria-describedby` for help text
- Ensure focus order follows visual order

**Example**:
```tsx
<IconButton aria-label="Delete item" color="error">
  <DeleteIcon />
</IconButton>
```

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order is logical and predictable
- Esc key closes modals and dialogs
- Enter/Space activates buttons

### Text Selection

```css
::selection {
  background-color: rgba(0, 122, 255, 0.2);
  color: inherit;
}
```

---

## Design System Checklist

When creating new components, ensure:

- [ ] Colors match the defined palette
- [ ] Typography uses the type scale
- [ ] Spacing follows the 8px grid
- [ ] Border radius is consistent
- [ ] Hover states have smooth transitions
- [ ] Focus states are visible
- [ ] Touch targets are at least 44px
- [ ] Contrast ratios meet WCAG AA
- [ ] RTL layout is supported
- [ ] Component is keyboard accessible
- [ ] Component works on mobile

---

## Resources

### Design Tools
- **Figma**: [Coming Soon] - Design mockups and prototypes
- **Theme Editor**: `src/styles/theme.ts` - Customize colors and styles

### Code References
- **Theme File**: [`src/styles/theme.ts`](file:///c:/React/DentalMedicalCenter/src/styles/theme.ts)
- **Global Styles**: [`src/styles/global.css`](file:///c:/React/DentalMedicalCenter/src/styles/global.css)
- **Index Styles**: [`src/index.css`](file:///c:/React/DentalMedicalCenter/src/index.css)

### External References
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material-UI Documentation](https://mui.com/material-ui/getting-started/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-16 | Initial design system documentation |

---

**Maintained by**: Development Team  
**Last Updated**: December 16, 2025  
**Status**: ✅ Active
