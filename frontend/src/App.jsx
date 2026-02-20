import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import TaskTracker from './TaskTracker';
import MobileTaskTracker from './mobile-prototype/MobileTaskTracker';
import TwoFactorSetup from './TwoFactorSetup';
import SettingsPage from './SettingsPage';
import API_BASE from './config';
import storage, { STORAGE_KEYS } from './utils/storage';

const App = () => {
  const navigate = useNavigate();
  const [authToken, setAuthToken] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authRole, setAuthRole] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Detect mobile/desktop on resize (debounced to avoid excessive re-renders)
  useEffect(() => {
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Check if user is already logged in on mount
  useEffect(() => {
    const validateAndRestoreSession = async () => {
      const token = storage.get(STORAGE_KEYS.AUTH_TOKEN);
      const user = storage.get(STORAGE_KEYS.AUTH_USER);
      const role = storage.get(STORAGE_KEYS.AUTH_ROLE);

      if (token && user) {
        try {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(`${API_BASE}/tasks?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            setAuthToken(token);
            setAuthUser(user);
            setAuthRole(role || 'limited');
          } else {
            storage.clearAuth();
          }
        } catch (error) {
          // Handle timeout gracefully - this is expected when backend is unresponsive
          if (error.name === 'AbortError') {
            // Timeout occurred - backend is likely down or slow
            // Silently clear session and let user login again
            storage.clearAuth();
            return; // Exit early, don't log as error
          }

          // Log other errors (network errors, etc.)
          console.error('Token validation failed:', error);
          storage.clearAuth();
        }
      }
      setIsAuthenticating(false);
    };

    validateAndRestoreSession();
  }, []);

  const handleLogin = (token, username, role) => {
    storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
    storage.set(STORAGE_KEYS.AUTH_USER, username);
    storage.set(STORAGE_KEYS.AUTH_ROLE, role || 'limited');
    setAuthToken(token);
    setAuthUser(username);
    setAuthRole(role || 'limited');
    navigate('/app');
  };

  const handleLogout = () => {
    storage.clearAuth();
    setAuthToken(null);
    setAuthUser(null);
    setAuthRole(null);
    navigate('/');
  };

  if (isAuthenticating) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f8f8'
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        authToken ? <Navigate to="/app" /> : <LandingPage onEnter={() => navigate('/login')} onSignUp={() => navigate('/signup')} />
      } />
      <Route path="/login" element={
        authToken ? <Navigate to="/app" /> : <LoginPage onLogin={handleLogin} onBack={() => navigate('/')} />
      } />
      <Route path="/signup" element={
        authToken ? <Navigate to="/app" /> : <SignUpPage />
      } />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes */}
      <Route path="/app" element={
        authToken ? (
          isMobile ? (
            <MobileTaskTracker authToken={authToken} authUser={authUser} authRole={authRole} onLogout={handleLogout} />
          ) : (
            <TaskTracker authToken={authToken} authUser={authUser} authRole={authRole} onLogout={handleLogout} />
          )
        ) : (
          <Navigate to="/login" />
        )
      } />

      <Route path="/tasks" element={
        authToken ? <Navigate to="/app" /> : <Navigate to="/login" />
      } />

      <Route path="/2fa-setup" element={
        authToken ? <TwoFactorSetup /> : <Navigate to="/login" />
      } />

      <Route path="/settings" element={
        authToken ? <SettingsPage /> : <Navigate to="/login" />
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
