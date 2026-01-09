# COMPREHENSIVE FRONTEND FIXES - PATCH GUIDE
# All 5 issues with exact locations and changes

## ✅ FIX 1: Page Title (ALREADY DONE)
File: /frontend/index.html
Changed: "World Wide Pitz" → "Dr. Pitz's Missions"

## FIX 2: Amount Column Font - Better Number Readability
File: /frontend/src/BankTransactions.jsx
Location: Line ~1376 (Amount td display in transactions table)

FIND THIS (around line 1376):
```javascript
<td style={{
  padding: '0.65rem 0.75rem',
  textAlign: 'right',
  fontWeight: '700',
  fontFamily: 'monospace',
  fontSize: '0.95rem',
  color: t.amount < 0 ? colors.accent : colors.text
}}>
```

REPLACE WITH:
```javascript
<td style={{
  padding: '0.65rem 0.75rem',
  textAlign: 'right',
  fontWeight: '700',
  fontFamily: 'Consolas, "Courier New", monospace',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.05em',
  fontSize: '0.95rem',
  color: t.amount < 0 ? colors.accent : colors.text
}}>
```

ALSO UPDATE Line ~838 (in chart section):
FIND:
```javascript
fontFamily: 'monospace',
```
REPLACE WITH:
```javascript
fontFamily: 'Consolas, "Courier New", monospace',
fontVariantNumeric: 'tabular-nums',
letterSpacing: '0.05em',
```

## FIX 3: Custom Autocomplete/Datalist Styling
Files: 
- /frontend/src/TaskTracker.jsx 
- /frontend/src/BankTransactions.jsx

ADD TO BOTH FILES in the <style> block (after the existing media queries):

```css
/* Custom autocomplete/datalist styling */
input[list] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%23000" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2.5rem !important;
}

input[list]::-webkit-calendar-picker-indicator {
  display: none !important;
}

input[list]:focus {
  box-shadow: 4px 4px 0px #000, 0 0 0 3px #FFD500 inset !important;
  background-color: #fffef0;
}
```

## FIX 4: Task Description Line Breaks
File: /frontend/src/TaskTracker.jsx
Location: Line ~645 (TaskCard component, task description display)

FIND THIS:
```javascript
{task.description && (
  <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
    {task.description}
  </p>
)}
```

REPLACE WITH:
```javascript
{task.description && (
  <p style={{ 
    margin: '0 0 12px 0', 
    color: '#666', 
    fontSize: '1rem', 
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  }}>
    {task.description}
  </p>
)}
```

## FIX 5: Tab Persistence on Refresh
File: /frontend/src/TaskTracker.jsx
Location: After line 14 (after `const [appView, setAppView] = useState('tasks');`)

ADD THESE TWO useEffect HOOKS:

```javascript
// Restore last active tab on mount
useEffect(() => {
  const savedView = localStorage.getItem('lastActiveView');
  if (savedView && (savedView === 'tasks' || savedView === 'transactions' || savedView === 'clients')) {
    setAppView(savedView);
  }
}, []);

// Save active tab whenever it changes
useEffect(() => {
  localStorage.setItem('lastActiveView', appView);
}, [appView]);
```

---

## MANUAL APPLICATION STEPS:

1. Open each file in your code editor
2. Use Ctrl+F (or Cmd+F) to find the exact text patterns
3. Replace with the new code
4. Save all files
5. Test in browser

## VERIFICATION:
After applying:
- ✓ Check browser tab shows "Dr. Pitz's Missions"
- ✓ Amount column numbers should be easier to read
- ✓ Autocomplete dropdowns should have custom styling with arrow
- ✓ Task descriptions should show line breaks correctly
- ✓ Refreshing page should keep you on the same tab
