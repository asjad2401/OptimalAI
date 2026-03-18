import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';
import { validateProductIdentifier } from '../utils/validation';

const getErrorMessage = (payload: unknown): string => {
  if (!payload) return 'Request failed.';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    const first = payload[0];
    return getErrorMessage(first);
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.message) return getErrorMessage(obj.message);
    if (obj.detail) return getErrorMessage(obj.detail);
    if (obj.error) return getErrorMessage(obj.error);
  }
  return 'Request failed.';
};

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
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Session expired. Please sign in again.');
        navigate('/login');
        return;
      }

      const res = await fetch(SCRAPER_ENDPOINTS.ANALYZE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_identifier: identifier }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          setError('Session expired. Please sign in again.');
          navigate('/login');
          return;
        }
        return setError(getErrorMessage(data));
      }

      setSuccess('Analysis completed.');
      setIdentifier('');
    } catch {
      setError('Network error. Please try again later.');
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
