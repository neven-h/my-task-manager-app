# Performance Improvements for Task Manager App

This document identifies slow or inefficient code patterns found during code review and provides specific suggestions for optimization.

## Backend (Python/Flask)

### 1. **Database Connection Pooling** ⚡ HIGH PRIORITY
**Location:** `backend/app.py` - `get_db_connection()` function (lines 258-270)

**Issue:** Each request creates a new database connection and closes it after use. This is inefficient for high-traffic scenarios as connection creation has significant overhead.

**Current Code:**
```python
@contextmanager
def get_db_connection():
    connection = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
            connection.close()
```

**Suggested Improvement:** Use connection pooling:
```python
from mysql.connector.pooling import MySQLConnectionPool

# Create pool at module level
DB_POOL = MySQLConnectionPool(
    pool_name="task_tracker_pool",
    pool_size=5,
    pool_reset_session=True,
    **DB_CONFIG
)

@contextmanager
def get_db_connection():
    connection = None
    try:
        connection = DB_POOL.get_connection()
        yield connection
    except Error as e:
        print(f"Database error: {e}")
        raise
    finally:
        if connection and connection.is_connected():
            connection.close()  # Returns to pool, not actually closed
```

---

### 2. **Repeated bcrypt Hashing at Startup** ⚡ HIGH PRIORITY
**Location:** `backend/app.py` - `_get_hardcoded_users()` function (lines 168-196)

**Issue:** Passwords are re-hashed with bcrypt.gensalt() every time the application starts. This is extremely slow (bcrypt is intentionally slow) and unnecessary since the passwords don't change.

**Current Code:**
```python
def _get_hardcoded_users():
    return {
        'pitz': {
            'password_hash': bcrypt.hashpw(os.getenv('USER_PITZ_PASSWORD').encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            'role': 'admin'
        },
        # ... repeated for each user
    }
```

**Suggested Improvement:** Store pre-hashed passwords in environment variables or hash once and cache:
```python
# Option 1: Store pre-hashed passwords in env vars
# USER_PITZ_PASSWORD_HASH=<pre-computed bcrypt hash>

# Option 2: Compute once and cache
_USER_CACHE = None

def _get_hardcoded_users():
    global _USER_CACHE
    if _USER_CACHE is not None:
        return _USER_CACHE
    
    # Only compute once
    _USER_CACHE = {
        'pitz': {
            'password_hash': bcrypt.hashpw(os.getenv('USER_PITZ_PASSWORD').encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            'role': 'admin'
        },
        # ...
    }
    return _USER_CACHE
```

---

### 3. **N+1 Query Pattern in Stats Endpoint** ⚡ MEDIUM PRIORITY
**Location:** `backend/app.py` - `get_stats()` function (lines 1916-2020)

**Issue:** Multiple separate queries are executed sequentially when they could be combined or executed in parallel.

**Current Code:**
```python
# Query 1: Overall stats
cursor.execute(query, params)
overall = cursor.fetchone()

# Query 2: Stats by category
cursor.execute(query, params)
by_category = cursor.fetchall()

# Query 3: Stats by client
cursor.execute(query, params)
by_client = cursor.fetchall()

# Query 4: Monthly stats
cursor.execute(query, params)
monthly = cursor.fetchall()
```

**Suggested Improvement:** Use a single query with UNION or execute queries in parallel using threading/asyncio.

---

### 4. **Inefficient Task Filtering** ⚡ MEDIUM PRIORITY
**Location:** `backend/app.py` - `get_tasks()` function (lines 1098-1201)

**Issue:** All task datetime conversions and tag parsing happen in Python after fetching data, rather than in SQL or more efficiently.

**Current Code:**
```python
for task in tasks:
    if task['task_date']:
        task['task_date'] = task['task_date'].isoformat()
    # ... more conversions
    if tags_value:
        task['tags'] = [t.strip() for t in tags_value.split(',') if t.strip()]
```

**Suggested Improvement:** Consider using MySQL's JSON functions or restructuring the database schema to store tags as JSON.

---

### 5. **File Encoding Detection Overhead** ⚡ LOW PRIORITY
**Location:** `backend/app.py` - `parse_transaction_file()` function (lines 2523-2655)

**Issue:** Multiple encoding attempts are tried sequentially, with the file being read multiple times.

**Suggested Improvement:** Use chardet more effectively or cache encoding detection results.

---

## Frontend (React)

### 6. **Redundant API Calls on Mount** ⚡ HIGH PRIORITY
**Location:** `frontend/src/TaskTracker.jsx` (lines 97-111)

**Issue:** Multiple API calls are triggered simultaneously on component mount, and then again when filters change.

**Current Code:**
```javascript
useEffect(() => {
    if (authUser && authRole) {
        fetchCategories();
        fetchTags();
        fetchClients();
        fetchTasks();
        fetchStats();
    }
}, [authUser, authRole]);

useEffect(() => {
    if (authUser && authRole) {
        fetchTasks();  // Duplicate call
    }
}, [filters, authUser, authRole]);
```

**Suggested Improvement:** Combine initial data fetching into a single effect and debounce filter changes:
```javascript
useEffect(() => {
    if (authUser && authRole) {
        Promise.all([
            fetchCategories(),
            fetchTags(),
            fetchClients(),
            fetchTasks(),
            fetchStats()
        ]);
    }
}, [authUser, authRole]);

// Use debounced filter effect
const debouncedFilters = useDebounce(filters, 300);
useEffect(() => {
    if (authUser && authRole) {
        fetchTasks();
    }
}, [debouncedFilters]);
```

---

### 7. **Multiple Filter Operations on Same Array** ⚡ MEDIUM PRIORITY
**Location:** `frontend/src/TaskTracker.jsx` (lines 2288-2355)

**Issue:** The tasks array is filtered multiple times with the same condition.

**Current Code:**
```javascript
{tasks.filter(t => t.status === 'uncompleted').length > 0 && (
    // ...
    {tasks.filter(t => t.status === 'uncompleted').map(task => ...)}
)}

{tasks.filter(t => t.status === 'completed').length > 0 && (
    // ...
    {tasks.filter(t => t.status === 'completed').map(task => ...)}
)}
```

**Suggested Improvement:** Use `useMemo` to compute filtered lists once:
```javascript
const { completedTasks, uncompletedTasks } = useMemo(() => ({
    completedTasks: tasks.filter(t => t.status === 'completed'),
    uncompletedTasks: tasks.filter(t => t.status === 'uncompleted')
}), [tasks]);
```

---

### 8. **Inline Function Definitions in JSX** ⚡ LOW PRIORITY
**Location:** Throughout `TaskTracker.jsx` and `BankTransactions.jsx`

**Issue:** Many event handlers are defined inline, causing unnecessary re-renders.

**Current Code:**
```javascript
onClick={() => setFilters({...filters, status: e.target.value})}
```

**Suggested Improvement:** Use `useCallback` for handlers or define them outside the render:
```javascript
const handleStatusChange = useCallback((e) => {
    setFilters(prev => ({...prev, status: e.target.value}));
}, []);
```

---

### 9. **Large Inline Styles** ⚡ LOW PRIORITY
**Location:** Throughout all JSX files

**Issue:** Massive inline style objects are recreated on every render, causing memory churn.

**Suggested Improvement:** Extract static styles to constants or CSS modules:
```javascript
// Move outside component
const CARD_STYLE = {
    background: '#fff',
    padding: '28px',
    // ...
};
```

---

### 10. **Inefficient Transaction Table Rendering** ⚡ MEDIUM PRIORITY
**Location:** `frontend/src/BankTransactions.jsx` (lines 776-970)

**Issue:** The pie chart and category aggregation are recalculated on every render.

**Current Code:**
```javascript
{monthTransactions.length > 0 && (() => {
    const categoryData = aggregateByCategory(filteredTransactions);
    // Complex SVG rendering...
})()}
```

**Suggested Improvement:** Use `useMemo` for expensive computations:
```javascript
const chartData = useMemo(() => {
    if (monthTransactions.length === 0) return null;
    return aggregateByCategory(filteredTransactions);
}, [filteredTransactions]);
```

---

## Implementation Priority

1. **Immediate Impact (Do Now):**
   - #1 Database Connection Pooling
   - #2 Bcrypt Hashing Cache
   - #6 Redundant API Calls
   - #7 Multiple Filter Operations

2. **Short Term (Next Sprint):**
   - #3 N+1 Query Pattern
   - #10 Transaction Table Rendering

3. **Long Term (Technical Debt):**
   - #4 Task Filtering Optimization
   - #5 File Encoding Detection
   - #8 Inline Functions
   - #9 Inline Styles

---

## Estimated Performance Gains

| Improvement | Startup Time | Response Time | Memory |
|-------------|--------------|---------------|--------|
| Connection Pooling | - | -30-50ms | Slight increase |
| Bcrypt Caching | -2-4 seconds | - | Slight increase |
| Redundant API Calls | - | -100-200ms | - |
| useMemo for filters | - | -10-20ms render | -5-10% |
| Chart memoization | - | -50-100ms render | -10% |

