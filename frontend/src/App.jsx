import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import TaskTracker from './TaskTracker';

const App = () => {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'app'
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('authUser');

    if (token && user) {
      setAuthToken(token);
      setAuthUser(user);
      setCurrentView('app');
    }
  }, []);

  const handleEnter = () => {
    // Go to login page
    setCurrentView('login');
  };

  const handleLogin = (token, username) => {
    setAuthToken(token);
    setAuthUser(username);
    setCurrentView('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setAuthToken(null);
    setAuthUser(null);
    setCurrentView('landing');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  if (currentView === 'landing') {
    return <LandingPage onEnter={handleEnter} />;
  }

  if (currentView === 'login') {
    return <LoginPage onLogin={handleLogin} onBack={handleBackToLanding} />;
  }

  if (currentView === 'app') {
    return <TaskTracker authToken={authToken} authUser={authUser} onLogout={handleLogout} />;
  }

  return null;
};

export default App;
