# DrPitz.club Design System Skill

## Overview
This skill documents the distinctive brutalist design system used throughout the drpitz.club task management application. The design philosophy emphasizes bold colors, heavy borders, sharp shadows, and functional aesthetics inspired by Italian art galleries.

## Core Design Philosophy

### Brutalist Principles
- **Bold & Unapologetic**: Heavy 3-4px borders, strong shadows, no subtlety
- **Functional First**: Every design element serves a clear purpose
- **High Contrast**: Black borders against bright backgrounds ensure readability
- **Tactile Interactions**: Visible hover states with shadow transformations
- **No Gradients**: Flat colors only - authenticity over polish

## Color Palette

### Primary Colors (Italian Gallery Inspired)
```css
--red-primary: #FF0000;      /* Uncompleted tasks, CTAs, warnings */
--yellow-primary: #FFD500;    /* Completed tasks, highlights, success */
--blue-primary: #0000FF;      /* Links, information, secondary actions */
--black: #000;                /* All borders, text */
--white: #fff;                /* Backgrounds, light text */
--gray-bg: #f8f8f8;          /* Secondary backgrounds, sidebars */
--gray-text: #666;            /* Secondary text, labels */
```

### Color Bar Pattern
Always include a tri-color bar at the top of major sections:
```css
.color-bar {
  height: 12px;
  width: 100%;
  background: linear-gradient(90deg, 
    #FF0000 0%, #FF0000 33.33%, 
    #FFD500 33.33%, #FFD500 66.66%, 
    #0000FF 66.66%, #0000FF 100%
  );
}
```

### Status Colors
```css
/* Completed */
background: #FFD500;
border: 3px solid #000;
color: #000;

/* Uncompleted */
background: #FF0000;
border: 3px solid #000;
color: #fff;
```

## Typography

### Font Stack
```css
font-family: 'Inter', 'Helvetica Neue', Calibri, sans-serif;
```

### Font Weights & Sizes
```css
/* Headers */
h1: font-size: clamp(1.5rem, 5vw, 3rem); font-weight: 900; letter-spacing: -1px;
h2: font-size: 2rem; font-weight: 900;
h3: font-size: 1.5rem; font-weight: 900;

/* Body */
body: font-size: 1rem; font-weight: 400; line-height: 1.6;
small-labels: font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;

/* Buttons */
font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
```

## Component Library

### Button System

#### Base Button
```css
.btn {
  transition: all 0.15s ease;
  cursor: pointer;
  border: 3px solid #000;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.85rem;
  padding: 14px 28px;
  background: #fff;
  color: #000;
}

.btn:hover:not(:disabled) {
  box-shadow: 4px 4px 0px #000;
  transform: translate(-2px, -2px);
}

.btn:active {
  box-shadow: none;
  transform: translate(0, 0);
}

.btn:disabled { 
  opacity: 0.4; 
  cursor: not-allowed; 
}
```

#### Button Variants
```css
.btn-red {
  background: #FF0000;
  color: #fff;
  border-color: #000;
}

.btn-yellow {
  background: #FFD500;
  color: #000;
  border-color: #000;
}

.btn-blue {
  background: #0000FF;
  color: #fff;
  border-color: #000;
}

.btn-green {
  background: #00AA00;
  color: #fff;
  border-color: #000;
}

.btn-white {
  background: #fff;
  color: #000;
  border-color: #000;
}
```

### Cards

#### Task Card
```css
.task-card {
  transition: all 0.2s ease;
  border: 3px solid #000;
  background: #fff;
  padding: 28px;
}

.task-card:hover {
  box-shadow: 8px 8px 0px #000;
  transform: translate(-4px, -4px);
}
```

**Structure Pattern:**
1. Header with title + status badge
2. Description (optional)
3. Categories as pills
4. Tags (optional)
5. Meta information grid (date, time, duration, client)
6. Notes section (if present, yellow background)

### Status Badge
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: 3px solid #000;
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

### Pills & Tags

#### Category Pills (Interactive)
```css
.category-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border: 2px solid #000;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  background: #fff;
  color: #000;
}

.category-pill:hover {
  box-shadow: 2px 2px 0px #000;
  transform: translate(-1px, -1px);
}

.category-pill.selected {
  background: #0000FF;
  color: #fff;
}
```

#### Tags (Display Only)
```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  font-size: 0.8rem;
  font-weight: 600;
}
```

### Forms

#### Input Fields
```css
input, select, textarea {
  font-family: 'Inter', sans-serif;
  padding: 12px 16px;
  border: 3px solid #000;
  width: 100%;
  font-size: 0.95rem;
  background: #fff;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  box-shadow: 4px 4px 0px #000;
}
```

#### Form Labels
```css
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

### Modals

#### Structure
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: white;
  border: 4px solid #000;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
```

**Modal Header Pattern:**
- Colored background (yellow for new, red for warnings, blue for info)
- Bold title, uppercase
- Close button (X icon)
- 3-4px solid border at bottom

### Information Grid
```css
/* Used for displaying task metadata */
.task-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  padding: 20px;
  background: #f8f8f8;
  border: 2px solid #000;
  font-size: 0.9rem;
}

.meta-label {
  color: #666;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-weight: 700;
}
```

## Layout Patterns

### Header Structure
```jsx
<header style={{
  background: '#fff',
  borderBottom: '4px solid #000',
  padding: '16px',
  position: 'sticky',
  top: 0,
  zIndex: 100
}}>
  <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
    {/* Color bar */}
    {/* Title */}
    {/* Action buttons */}
  </div>
</header>
```

### Sidebar Pattern
```jsx
<div className="sidebar" style={{
  width: '320px',
  padding: '32px 24px',
  borderRight: '3px solid #000',
  background: '#f8f8f8'
}}>
  {/* Filters */}
  {/* Export buttons */}
</div>
```

### Main Content
```jsx
<div style={{
  flex: 1,
  padding: '48px'
}}>
  {/* Content */}
</div>
```

## Interaction States

### Hover States
- Buttons: Shadow appears (4px 4px), element moves (-2px, -2px)
- Cards: Larger shadow (8px 8px), element moves (-4px, -4px)
- Pills: Small shadow (2px 2px), element moves (-1px, -1px)

### Active States
- Remove all shadows
- Return to original position (0, 0)

### Disabled States
- Opacity: 0.4
- Cursor: not-allowed
- No hover effects

## Accessibility

### Color Contrast
- All text on white: Black (#000) - WCAG AAA
- All text on yellow: Black (#000) - WCAG AAA
- White text on red: #fff on #FF0000 - WCAG AA
- White text on blue: #fff on #0000FF - WCAG AA

### Focus States
- Use same shadow pattern as hover
- Ensure visible focus indicators on all interactive elements

### ARIA Labels
- Always provide aria-labels for icon-only buttons
- Use semantic HTML (header, nav, main, section)

## Common Patterns

### Section Headers
```jsx
<h3 style={{
  fontSize: '1.5rem',
  fontWeight: 900,
  marginBottom: '24px',
  textTransform: 'uppercase',
  color: '#FF0000',  // Use brand color
  borderBottom: '4px solid #FF0000',
  paddingBottom: '12px'
}}>
  Section Title ({count})
</h3>
```

### Stats Display
```jsx
<div style={{
  border: '3px solid #000',
  padding: '32px',
  background: '#FFD500'  // or #fff, #FF0000
}}>
  <div style={{
    fontSize: '3rem',
    fontWeight: 900
  }}>
    {value}
  </div>
  <div style={{
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: '8px'
  }}>
    {label}
  </div>
</div>
```

### Error/Alert Banners
```jsx
<div style={{
  background: '#FF0000',
  color: '#fff',
  padding: '16px 48px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  borderBottom: '3px solid #000'
}}>
  <AlertCircle size={20} />
  <span style={{ fontWeight: 600 }}>{error}</span>
  <button onClick={close}>
    <X size={20} />
  </button>
</div>
```

### Loading States
```jsx
<div style={{
  textAlign: 'center',
  padding: '64px',
  fontSize: '1.1rem',
  color: '#666'
}}>
  Loading...
</div>
```

### Empty States
```jsx
<div style={{
  textAlign: 'center',
  padding: '64px',
  border: '3px solid #000',
  background: '#f8f8f8'
}}>
  <p style={{
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '12px'
  }}>
    No items found
  </p>
  <p style={{ color: '#666' }}>
    Helpful message here
  </p>
</div>
```

## Animation Timings

### Transitions
```css
/* Standard transitions */
transition: all 0.15s ease;

/* Card transitions (slightly slower) */
transition: all 0.2s ease;
```

### Animation Philosophy
- Quick and snappy (0.15-0.2s)
- No easing curves beyond 'ease'
- Immediate feedback on interaction

## Implementation Checklist

When creating a new component:
- [ ] Apply 3px solid black borders
- [ ] Use brand colors (red, yellow, blue)
- [ ] Implement hover shadow transforms
- [ ] Set correct font weights (700-900 for UI elements)
- [ ] Use uppercase for labels and buttons
- [ ] Test with Hebrew text (RTL support if needed)
- [ ] Verify color contrast
- [ ] Add loading and error states
- [ ] Include focus states for accessibility

## Do's and Don'ts

### Do's ✓
- Use thick (3-4px) borders everywhere
- Make hover states obvious with shadows
- Keep spacing generous (16-32px)
- Use bold typography (700-900 weight)
- Maintain high contrast
- Make buttons feel tactile
- Use semantic HTML

### Don'ts ✗
- Don't use gradients or subtle effects
- Don't use thin borders (< 2px)
- Don't use light font weights for UI elements
- Don't make hover states subtle
- Don't use pastel colors
- Don't add rounded corners (keep sharp edges)
- Don't use box-shadows without the brutalist offset pattern

## Hebrew Language Support

### Character Encoding
- Always use UTF-8 encoding
- Database: utf8mb4 collation
- API responses: proper Content-Type headers

### Text Display
- Hebrew text displays left-to-right in this system
- Font stack supports Hebrew characters
- No special RTL layout needed for current implementation

## File Organization

### Component Structure
```
Component/
  - Main logic and structure
  - Inline styles (preferred for this project)
```

### Style Approach
- Inline styles for component-specific styling
- Global CSS for utility classes
- No CSS modules or styled-components

## Testing Checklist

Before deploying a new feature:
1. Desktop Chrome/Firefox/Safari
2. Test with Hebrew text
3. Test all button states (hover, active, disabled)
4. Verify 3px borders on all interactive elements
5. Check shadow transforms on hover
6. Validate color contrast
7. Verify form submissions

## Future Considerations

### Potential Expansions
- Dark mode variant (black background, white borders, inverted colors)
- Print stylesheet (remove shadows, optimize for B&W)
- Animation library for complex transitions
- Icon system standardization
- Additional color variants for new features

### Maintaining Consistency
- Review this document before adding new components
- Use existing components as reference
- Keep the brutalist aesthetic at the forefront
- Prioritize function over decoration

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Maintained by:** Noa (drpitz.club)
