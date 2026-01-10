import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('Password reset functionality coming soon!');
  };

  return (
    <div style={{ minHeight: '100vh', display:  'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
      <div style={{ maxWidth: '400px', width:  '100%', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Forgot Password</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#007bff', color:  'white', border: 'none', borderRadius:  '4px', cursor: 'pointer', marginBottom: '1rem' }}>
            Reset Password
          </button>
        </form>
        {message && <p style={{ color: '#28a745', marginBottom: '1rem' }}>{message}</p>}
        <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '0.75rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;