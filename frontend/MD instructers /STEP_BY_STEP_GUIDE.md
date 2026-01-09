# STEP-BY-STEP FRONTEND FIXES GUIDE

I've created 4 fix files for you to copy-paste:
- fix2-amount-font.js
- fix3-autocomplete-style.css
- fix4-line-breaks.js
- fix5-tab-persistence.js

## FIX 1: ✅ ALREADY DONE
Title changed to "Dr. Pitz's Missions" in index.html

---

## FIX 2: Amount Column Font (BankTransactions.jsx)

### Step 2.1: Open BankTransactions.jsx
1. Press Ctrl+F (or Cmd+F) to search
2. Search for: `fontFamily: 'monospace'`
3. You should find TWO locations

### Step 2.2: First location (~line 838, in chart)
**FIND:**
```javascript
fontFamily: 'monospace',
color: colors.text
```

**CHANGE TO:**
```javascript
fontFamily: 'Consolas, "Courier New", monospace',
fontVariantNumeric: 'tabular-nums',
letterSpacing: '0.05em',
color: colors.text
```

### Step 2.3: Second location (~line 1376, in table)
**FIND the entire <td> style block:**
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

**REPLACE fontFamily line with:**
```javascript
fontFamily: 'Consolas, "Courier New", monospace',
fontVariantNumeric: 'tabular-nums',
letterSpacing: '0.05em',
```

**OR** just open `fix2-amount-font.js` and copy the entire style object from there!

✅ SAVE FILE

---

## FIX 3: Autocomplete Styling (TWO FILES)

### Step 3.1: Open TaskTracker.jsx
1. Scroll to the `<style>{` ... `}</style>` section (around line 850)
2. Find the CLOSING `}` before `</style>`
3. **RIGHT BEFORE** the closing `</style>`, ADD:

```css
/* Custom autocomplete styling */
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

**TIP:** Just open `fix3-autocomplete-style.css` and copy everything!

✅ SAVE FILE

### Step 3.2: Open BankTransactions.jsx
Repeat the same steps - add the CSS to the <style> block

✅ SAVE FILE

---

## FIX 4: Task Description Line Breaks (TaskTracker.jsx)

### Step 4.1: Open TaskTracker.jsx
1. Press Ctrl+F and search for: `{task.description && (`
2. Find the one inside the TaskCard component (around line 645)
3. You'll see a `<p style={{` with the task description

### Step 4.2: Add two style properties
**FIND:**
```javascript
<p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
```

**CHANGE TO:**
```javascript
<p style={{ 
  margin: '0 0 12px 0', 
  color: '#666', 
  fontSize: '1rem', 
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word'
}}>
```

**TIP:** Open `fix4-line-breaks.js` and copy the entire paragraph element!

✅ SAVE FILE

---

## FIX 5: Tab Persistence (TaskTracker.jsx)

### Step 5.1: Open TaskTracker.jsx
1. Search for: `const [appView, setAppView] = useState('tasks');`
2. It's around line 14
3. Go to the line RIGHT AFTER it

### Step 5.2: Add two useEffect hooks
**After the line:**
```javascript
const [appView, setAppView] = useState('tasks');
```

**ADD THESE TWO useEffect blocks:**
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

**TIP:** Open `fix5-tab-persistence.js` and copy both useEffect blocks!

✅ SAVE FILE

---

## TESTING YOUR FIXES

1. **Start your dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Check each fix:**
   - ✓ Browser tab title = "Dr. Pitz's Missions"
   - ✓ Amount column numbers easier to read (Consolas font)
   - ✓ Description/Client autocomplete has custom arrow dropdown
   - ✓ Task descriptions show line breaks (try creating a task with Enter key)
   - ✓ Refresh page stays on same tab (go to Transactions, refresh, still on Transactions)

3. **If something doesn't work:**
   - Check browser console for errors
   - Make sure you saved all files
   - Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## COMMIT YOUR CHANGES

Once everything works:
```bash
git add .
git commit -m "Frontend fixes: better fonts, autocomplete styling, line breaks, tab persistence"
git push origin frontend-fixes
```

Then create a pull request on GitHub!
