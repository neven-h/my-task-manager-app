import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import TaskTracker from './TaskTracker';

const App = () => {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'login', 'signup', 'app'
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authRole, setAuthRole] = useState(null); // 'admin' or 'limited'

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('authUser');
    const role = localStorage.getItem('authRole');

    if (token && user) {
      setAuthToken(token);
      setAuthUser(user);
      setAuthRole(role || 'admin');
      setCurrentView('app');
    }
  }, []);

  const handleEnter = () => {
    // Go to login page
    setCurrentView('login');
  };

  const handleSignUp = () => {
    // Go to sign up page
    setCurrentView('signup');
  };

  const handleLogin = (token, username, role) => {
    setAuthToken(token);
    setAuthUser(username);
    setAuthRole(role || 'admin');
    setCurrentView('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authRole');
    setAuthToken(null);
    setAuthUser(null);
    setAuthRole(null);
    setCurrentView('landing');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  if (currentView === 'landing') {
    return <LandingPage onEnter={handleEnter} onSignUp={handleSignUp} />;
  }

  if (currentView === 'login') {
    return <LoginPage onLogin={handleLogin} onBack={handleBackToLanding} />;
  }

  if (currentView === 'signup') {
    return <SignUpPage onBack={handleBackToLanding} />;
  }

  if (currentView === 'app') {
    return <TaskTracker authToken={authToken} authUser={authUser} authRole={authRole} onLogout={handleLogout} />;
  }

  return null;
};

export default App;
