import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';
import { validateProductIdentifier } from '../utils/validation';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateProductIdentifier(identifier);
    if (validationError) {
      setSuccess('');
      return setError(validationError);
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(SCRAPER_ENDPOINTS.ANALYZE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_identifier: identifier }),
      });

      const data = await res.json();

      if (!res.ok) {
        return setError(data.detail?.[0]?.msg || data.detail || 'Request failed.');
      }

      setSuccess(data.message);
      setIdentifier('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          Optimal<span className="logo-accent">AI</span>
        </div>
        <button className="dashboard-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </header>

      <main className="dashboard-main">
        <div className="analyze-card">
          <h2 className="analyze-card-title">Analyze a Product</h2>
          <p className="analyze-card-description">
            Enter an Amazon ASIN or product URL to begin competitive analysis.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="product-identifier">
                ASIN or Product URL
              </label>
              <input
                id="product-identifier"
                type="text"
                className="form-input"
                placeholder="B08N5WRWNW or https://amazon.com/dp/..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            {error && <div className="error-bar">{error}</div>}
            {success && <div className="success-bar">{success}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Analyze Product'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
