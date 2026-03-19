import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';
import { validateProductIdentifier } from '../utils/validation';

const PROGRESS_STEPS = [
  'Fetching your product...',
  'Identifying competitors...',
  'Scraping competitor data...',
  'Running analysis...',
  'Done.',
];

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
  const [progressStep, setProgressStep] = useState(0);

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
    setProgressStep(0);

    const progressTicker = window.setInterval(() => {
      setProgressStep((prev) => Math.min(prev + 1, PROGRESS_STEPS.length - 2));
    }, 1800);

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

      setProgressStep(PROGRESS_STEPS.length - 1);
      setSuccess('Analysis completed.');
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      setIdentifier('');
    } catch {
      setError('Network error. Please try again later.');
    } finally {
      window.clearInterval(progressTicker);
      setLoading(false);
    }
  };

  return (
    <div className="analysis-page">
      <div className="analysis-card">
        <div className="analysis-card-top">
          <div>
            <div className="auth-form-subtitle">NEW ANALYSIS</div>
            <h2 className="analyze-card-title">Analyze a Product</h2>
          </div>
          <button className="analysis-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>

        <div className="auth-form-divider" />

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
              disabled={loading}
            />
          </div>

          {error && <div className="error-bar">{error}</div>}
          {success && <div className="success-bar">{success}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Running Analysis...' : 'Analyze Product'}
          </button>

          {loading && (
            <div className="analysis-progress" aria-live="polite">
              {PROGRESS_STEPS.map((step, index) => {
                const status =
                  index < progressStep ? 'done' : index === progressStep ? 'active' : 'pending';
                return (
                  <div key={step} className={`analysis-progress-step ${status}`}>
                    <span className="analysis-progress-dot" />
                    <span className="analysis-progress-text">{step}</span>
                  </div>
                );
              })}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
