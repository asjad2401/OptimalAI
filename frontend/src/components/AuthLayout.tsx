import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-container">
      {/* Left Panel */}
      <div className="auth-brand-panel">
        <div className="logo-container">
          Optimal<span className="logo-accent">AI</span>
          <div className="tagline">COMPETITIVE INTELLIGENCE PLATFORM</div>
        </div>
        
        <div className="hero-content">
          <h1 className="hero-heading">
            Know your market.<br/>
            <em>Outperform</em> your competition.
          </h1>
          <p className="hero-body">
            AI-driven insights to uncover strategic advantages in your vertical.
          </p>
          
          <div className="trust-indicators">
            <div className="trust-item">// AI-POWERED ANALYSIS</div>
            <div className="trust-item">// COMPETITOR BENCHMARKING</div>
            <div className="trust-item">// ACTIONABLE RECOMMENDATIONS</div>
          </div>
        </div>

        <div className="footer-text">SEECS · NUST · 2026</div>
      </div>

      {/* Right Form Panel */}
      <div className="auth-form-panel">
        <div className="mobile-logo-header">
          Optimal<span className="logo-accent">AI</span>
        </div>
        <div className="auth-form-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
};
