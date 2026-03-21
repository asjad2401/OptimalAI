import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-section">
      <div className="page-card dashboard-placeholder-card">
        <div className="auth-form-subtitle">WORKSPACE</div>
        <h2 className="analyze-card-title">Dashboard</h2>
        <div className="auth-form-divider" />
        <p className="analyze-card-description">
          Start a new analysis to generate your competitor comparison report.
        </p>
        <button className="btn-primary dashboard-cta" onClick={() => navigate('/analysis/new')}>
          New Analysis
        </button>
      </div>
    </div>
  );
};
