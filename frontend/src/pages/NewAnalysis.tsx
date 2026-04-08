import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

type LastReportSnapshot = {
  analysisId: string;
  title?: string;
  asin?: string;
  image_url?: string | null;
  description?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
};

const readLastReportSnapshot = (): LastReportSnapshot | null => {
  try {
    const raw = localStorage.getItem('latest_report_snapshot');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastReportSnapshot;
    if (!parsed.analysisId) return null;
    return parsed;
  } catch {
    return null;
  }
};

const asPrice = (value?: number | null) => (value === null || value === undefined ? '—' : `$${value.toFixed(2)}`);
const asNumber = (value?: number | null) => (value === null || value === undefined ? '—' : String(value));
const asStars = (value?: number | null) => (value === null || value === undefined ? '—' : `★ ${value.toFixed(1)}`);
const shouldForceFreshFromSearch = (search: string) => new URLSearchParams(search).get('forceFresh') === '1';

export const NewAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forceFresh, setForceFresh] = useState(() => shouldForceFreshFromSearch(location.search));
  const [progressStep, setProgressStep] = useState(0);
  const [lastReport, setLastReport] = useState<LastReportSnapshot | null>(null);
  const [lastReportImageFailed, setLastReportImageFailed] = useState(false);

  useEffect(() => {
    setLastReport(readLastReportSnapshot());
  }, []);

  useEffect(() => {
    setLastReportImageFailed(false);
  }, [lastReport?.analysisId, lastReport?.image_url]);

  useEffect(() => {
    setForceFresh(shouldForceFreshFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    const hydrateLastReport = async () => {
      if (!lastReport?.analysisId) return;

      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const res = await fetch(SCRAPER_ENDPOINTS.REPORT(lastReport.analysisId), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const payload = (await res.json()) as {
          data?: {
            title?: string | null;
            asin?: string | null;
            image_url?: string | null;
            description?: string | null;
            price?: number | null;
            rating?: number | null;
            review_count?: number | null;
          };
        };

        if (!payload?.data) return;
        const hydrated = payload.data;

        setLastReport((prev) => {
          if (!prev || prev.analysisId !== lastReport.analysisId) return prev;
          return {
            ...prev,
            title: hydrated.title ?? prev.title,
            asin: hydrated.asin ?? prev.asin,
            image_url: hydrated.image_url ?? prev.image_url,
            description: hydrated.description ?? prev.description,
            price: hydrated.price ?? prev.price,
            rating: hydrated.rating ?? prev.rating,
            review_count: hydrated.review_count ?? prev.review_count,
          };
        });
      } catch {
        // Keep snapshot fallback silently.
      }
    };

    hydrateLastReport();
  }, [lastReport?.analysisId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateProductIdentifier(identifier);
    if (validationError) {
      return setError(validationError);
    }

    setError('');
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
        body: JSON.stringify({
          product_identifier: identifier,
          force_fresh: forceFresh,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_email');
          setError('Session expired. Please sign in again.');
          navigate('/login');
          return;
        }
        return setError(getErrorMessage(data));
      }

      const analysisId =
        typeof data === 'object' && data !== null && 'analysis_id' in data
          ? String((data as Record<string, unknown>).analysis_id || '')
          : '';

      if (!analysisId) {
        return setError('Analysis completed but no report id was returned.');
      }

      setProgressStep(PROGRESS_STEPS.length - 1);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      navigate(`/report/${analysisId}`);
    } catch {
      setError('Network error. Please try again later.');
    } finally {
      window.clearInterval(progressTicker);
      setLoading(false);
    }
  };

  return (
    <div className="page-section">
      <div className="analysis-two-col">
        <div className="page-card analysis-main-card">
          <div className="auth-form-subtitle">NEW ANALYSIS</div>
          <h2 className="analyze-card-title">Analyze a Product</h2>
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

            <label className="analysis-option-row" htmlFor="force-fresh-scrape">
              <input
                id="force-fresh-scrape"
                type="checkbox"
                checked={forceFresh}
                onChange={(e) => setForceFresh(e.target.checked)}
                disabled={loading}
              />
              <span>Force fresh scrape (use fresh data, may take longer)</span>
            </label>

            {error && <div className="error-bar">{error}</div>}

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

        <div className="page-card last-analysis-section">
          <div className="last-report-top">
            <span className="last-report-label">LAST ANALYSIS</span>
            {lastReport?.analysisId ? (
              <button
                type="button"
                className="btn-secondary btn-uniform btn-uniform-sm"
                onClick={() => navigate(`/report/${lastReport.analysisId}`)}
              >
                Open Report
              </button>
            ) : null}
          </div>

          {lastReport ? (
            <div className="last-analysis-layout">
              {lastReport.image_url && !lastReportImageFailed ? (
                <img
                  className="last-analysis-image"
                  src={lastReport.image_url}
                  alt={lastReport.title || lastReport.asin || 'Last analyzed product'}
                  onError={() => setLastReportImageFailed(true)}
                />
              ) : (
                <div className="last-analysis-image last-analysis-image-placeholder" />
              )}

              <div className="last-analysis-content">
                <h3 className="last-analysis-title">{lastReport.title || 'Untitled Product'}</h3>
                <p className="last-analysis-asin mono">ASIN: {lastReport.asin || '—'}</p>
                <p className="last-analysis-description">
                  {lastReport.description || 'No saved description available for this report yet.'}
                </p>
                <div className="last-analysis-stats mono">
                  {asStars(lastReport.rating)} · {asNumber(lastReport.review_count)} reviews · {asPrice(lastReport.price)}
                </div>
              </div>
            </div>
          ) : (
            <div className="last-analysis-empty">No previous report yet. Run an analysis to see it here.</div>
          )}
        </div>
      </div>
    </div>
  );
};
