// FIX 5: Tab Persistence on Refresh
// Add these two useEffect hooks to TaskTracker.jsx

// LOCATION: TaskTracker.jsx, after line 14
// FIND: const [appView, setAppView] = useState('tasks');
// ADD THESE TWO useEffect HOOKS RIGHT AFTER IT:

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
