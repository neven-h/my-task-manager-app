import React from 'react';

/**
 * Reusable alert component for displaying error or success messages.
 * Used consistently across authentication pages.
 * 
 * @param {string} type - 'error' or 'success'
 * @param {string} message - The message to display
 */
const Alert = ({ type = 'error', message }) => {
  if (!message) return null;

  const styles = {
    error: {
      background: '#dc3545',
      color: 'white',
    },
    success: {
      background: '#28a745',
      color: 'white',
    }
  };

  const baseStyle = {
    padding: '12px 16px',
    marginBottom: '20px',
    border: '2px solid #000',
    fontWeight: 600,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  };

  return (
    <div style={{ ...baseStyle, ...styles[type] }}>
      {message}
    </div>
  );
};

export default Alert;
