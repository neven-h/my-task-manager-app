# Updates Needed for New Features

## ✅ Backend Already Updated!

The backend (`backend/app.py`) has been successfully updated with:
- ✅ Draft status added (draft/uncompleted/completed)
- ✅ Tags field added to database
- ✅ New categories: "Nursing" and "Moshe"
- ✅ Status cycling: draft → uncompleted → completed → draft
- ✅ Tags stored as comma-separated strings, returned as arrays

## ⚠️ Frontend Needs Manual Updates

Due to file size, please make these changes to `frontend/src/App.jsx`:

### 1. Update Form Data Default Status (Line ~40)
Change:
```javascript
status: 'completed',
```
To:
```javascript
status: 'draft',
tags: [],
```

### 2. Add Tags State and Functions (After line ~42)
Add:
```javascript
const [tagInput, setTagInput] = useState('');

const addTag = () => {
  if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
    setFormData({...formData, tags: [...formData.tags, tagInput.trim()]});
    setTagInput('');
  }
};

const removeTag = (tagToRemove) => {
  setFormData({...formData, tags: formData.tags.filter(t => t !== tagToRemove)});
};
```

### 3. Update getCategoryColor Function (Line ~245)
Add two new categories to the colors object:
```javascript
'nursing': '#B85C9E',
'moshe': '#6B8E4F',
```

### 4. Add New CSS for Tags and Draft Status (In the `<style>` tag around line ~320)
Add these two rules:
```css
.status-draft {
  background: #e7f3ff;
  color: #004085;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.tag button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
```

### 5. Update Status Filter (Around line ~600)
Add draft option:
```javascript
<option value="all">All Status</option>
<option value="draft">Draft</option>
<option value="uncompleted">Uncompleted</option>
<option value="completed">Completed</option>
```

### 6. Update Status Display in Task Cards (Around line ~750)
Change status badge logic:
```javascript
<span className={`status-badge status-${task.status}`}>
  {task.status === 'completed' ? (
    <><Check size={12} /> Completed</>
  ) : task.status === 'draft' ? (
    <><FileText size={12} /> Draft</>
  ) : (
    <>Uncompleted</>
  )}
</span>
```

### 7. Add Tags Display in Task Cards (Around line ~760, after description)
```javascript
{task.tags && task.tags.length > 0 && (
  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
    {task.tags.map((tag, idx) => (
      <span key={idx} className="tag">
        <Tag size={12} /> {tag}
      </span>
    ))}
  </div>
)}
```

### 8. Change Toggle Button Icon (Around line ~780)
Change from `<Check size={16} />` to:
```javascript
<RefreshCw size={16} />
```
And title from "Toggle completion status" to "Cycle status"

### 9. Update Import Statement (Line ~2)
Add `FileText` and `Tag` to the imports:
```javascript
import { 
  Search, Plus, Calendar, Clock, X, BarChart3, 
  Check, Edit2, Trash2, Download, RefreshCw, AlertCircle, FileText, Tag
} from 'lucide-react';
```

### 10. Add Tags Field in Form Modal (Around line ~1140, before Notes)
```javascript
<div>
  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tags</label>
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
    <input
      type="text"
      placeholder="Add a tag..."
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag();
        }
      }}
      style={{ flex: 1 }}
    />
    <button
      type="button"
      onClick={addTag}
      className="btn btn-outline"
      style={{ padding: '0.75rem 1rem' }}
    >
      Add
    </button>
  </div>
  {formData.tags.length > 0 && (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {formData.tags.map((tag, idx) => (
        <span key={idx} className="tag">
          <Tag size={12} /> {tag}
          <button type="button" onClick={() => removeTag(tag)}>
            <X size={14} />
          </button>
        </span>
      ))}
    </div>
  )}
</div>
```

### 11. Update Status Dropdown in Form (Around line ~1150)
Add draft option:
```javascript
<option value="draft">Draft</option>
<option value="uncompleted">Uncompleted</option>
<option value="completed">Completed</option>
```

### 12. Update startEdit Function (Around line ~190)
Add tags to the form data:
```javascript
tags: task.tags || [],
```

### 13. Update resetForm Function (Around line ~205)
Add:
```javascript
tags: [],
```
And before setEditingTask:
```javascript
setTagInput('');
```

### 14. Add Draft Stats (Around line ~870 in stats view)
Add a new stats card:
```javascript
<div style={{
  background: 'white',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
}}>
  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1565c0' }}>
    {stats.overall.draft_tasks || 0}
  </div>
  <div style={{ color: '#888', marginTop: '0.5rem' }}>Draft</div>
</div>
```

## 🔄 How to Apply Changes

1. **Stop both servers** (Ctrl+C in both terminals)
2. **Restart backend**: `cd backend && python3 app.py`
   - This will update the database schema automatically
3. **Make the frontend changes** listed above in `frontend/src/App.jsx`
4. **Restart frontend**: `cd frontend && npm run dev`

## ✅ What You'll Have After Updates:

1. ✅ **Draft Status**: New tasks default to "draft", cycle through draft → uncompleted → completed
2. ✅ **Tags**: Add multiple tags to any task for flexible organization
3. ✅ **New Categories**: "Nursing" and "Moshe" added
4. ✅ **Better Workflow**: Create drafts, mark uncompleted when working, completed when done
5. ✅ **Clear Separation**: Completed tasks (with duration) vs uncompleted tasks (for follow-up)

## Need Help?

If these changes seem overwhelming, I can provide a complete new App.jsx file. Just let me know!
