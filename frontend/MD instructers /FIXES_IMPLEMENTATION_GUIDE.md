# Frontend Fixes Implementation Guide

## ISSUE 1: Amount Column Font ✓ FIXED
**File:** `/frontend/index.html`
**Status:** Already fixed - changed title to "Dr. Pitz's Missions"

## ISSUE 2: Amount Column Font - Numbers Hard to Read
**File:** `/frontend/src/BankTransactions.jsx`
**What to change:** Add `fontFamily: 'monospace'` and `fontVariantNumeric: 'tabular-nums'` to Amount column cells

**Line ~1356:** (Amount column display)
```javascript
// CURRENT:
fontFamily: 'monospace',

// CHANGE TO:
fontFamily: 'Consolas, "Courier New", monospace',
fontVariantNumeric: 'tabular-nums',
letterSpacing: '0.05em'
```

## ISSUE 3: Description/Client Autocomplete Styling
**Files:** 
- `/frontend/src/TaskTracker.jsx` 
- `/frontend/src/BankTransactions.jsx`

**Add custom datalist styling in `<style>` block:**
```css
/* Custom autocomplete styling */
input[list]::-webkit-calendar-picker-indicator {
  display: none !important;
}

input[list] {
  position: relative;
  background: #fff;
}

input[list]:focus {
  box-shadow: 4px 4px 0px #000, 0 0 0 3px #FFD500 inset !important;
}

/* Style datalist options */
datalist {
  display: none;
}
```

## ISSUE 4: Task Description Display with Line Breaks
**File:** `/frontend/src/TaskTracker.jsx`
**Line ~645:** (Task description display in TaskCard)

```javascript
// CURRENT:
{task.description && (
  <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
    {task.description}
  </p>
)}

// CHANGE TO:
{task.description && (
  <p style={{ 
    margin: '0 0 12px 0', 
    color: '#666', 
    fontSize: '1rem', 
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',  // ← ADD THIS
    wordBreak: 'break-word'   // ← ADD THIS
  }}>
    {task.description}
  </p>
)}
```

## ISSUE 5: Tab Persistence on Refresh
**File:** `/frontend/src/App.jsx`

**Add after line 19 (after the useState declarations):**
```javascript
// Restore last active tab
useEffect(() => {
  const savedView = localStorage.getItem('lastActiveView');
  if (savedView && currentView === 'app') {
    // This will be handled in TaskTracker itself
  }
}, [currentView]);
```

**File:** `/frontend/src/TaskTracker.jsx`
**Add after line 14 (after appView useState):**
```javascript
// Save and restore active tab
useEffect(() => {
  const savedView = localStorage.getItem('lastActiveView');
  if (savedView && (savedView === 'tasks' || savedView === 'transactions' || savedView === 'clients')) {
    setAppView(savedView);
  }
}, []);

useEffect(() => {
  localStorage.setItem('lastActiveView', appView);
}, [appView]);
```

## Summary
All 5 issues can be fixed with targeted edits. Would you like me to:
1. Implement all fixes automatically
2. Implement them one by one so you can review
3. Provide the exact code snippets for you to implement manually

The changes are minimal and focused:
- Title: ✓ Already done
- Amount font: 3 style properties
- Autocomplete styling: CSS block addition
- Line breaks: 2 style properties
- Tab persistence: 2 useEffect blocks
