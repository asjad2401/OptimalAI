import React from 'react';
import { Link } from 'react-router-dom';

export const Landing: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--ink)',
      color: 'var(--canvas)'
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '32px',
        fontWeight: 600,
        marginBottom: '24px'
      }}>
        Optimal<span style={{ color: 'var(--accent-gold)' }}>AI</span>
      </div>
      
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '24px',
        marginBottom: '48px',
        color: 'var(--placeholder)'
      }}>
        A Competitive Intelligence Platform
      </p>

      <div style={{ display: 'flex', gap: '16px' }}>
        <Link to="/login" style={{
          padding: '12px 24px',
          backgroundColor: 'var(--canvas)',
          color: 'var(--ink)',
          borderRadius: '4px',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)'
        }}>Sign In</Link>
        <Link to="/register" style={{
          padding: '12px 24px',
          backgroundColor: 'var(--accent-gold)',
          color: 'var(--ink)',
          borderRadius: '4px',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)'
        }}>Register</Link>
      </div>
    </div>
  );
};
