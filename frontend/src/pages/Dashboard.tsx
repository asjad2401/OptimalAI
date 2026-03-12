import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--canvas)',
      color: 'var(--primary-text)',
      fontFamily: 'var(--font-sans)',
      padding: '24px'
    }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: '16px' }}>Dashboard</h1>
      <p style={{ marginBottom: '32px', color: 'var(--secondary-text)' }}>
        You are successfully logged in. This is a temporary dummy page.
      </p>
      
      <button 
        onClick={handleLogout}
        className="btn-primary"
        style={{ maxWidth: '200px' }}
      >
        Sign Out
      </button>
    </div>
  );
};
