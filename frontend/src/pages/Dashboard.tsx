import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';

type HistoryItem = {
  analysis_id: string;
  asin: string;
  title?: string | null;
  image_url?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
  created_at: string;
};

type ReportDetail = {
  recommendations?: {
    summary?: string;
    recommendations?: Array<{
      title: string;
      rationale: string;
      priority: string;
    }>;
  };
};

const asPrice = (value?: number | null) => (value === null || value === undefined ? '—' : `$${value.toFixed(2)}`);
const asRating = (value?: number | null) => (value === null || value === undefined ? '—' : `★ ${value.toFixed(1)}`);
const asNumber = (value?: number | null) => (value === null || value === undefined ? '—' : String(value));
const asDate = (value: string) => new Date(value).toLocaleDateString();

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});
  const [selectedReportDetail, setSelectedReportDetail] = useState<ReportDetail | null>(null);
  const [selectedDetailLoading, setSelectedDetailLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(SCRAPER_ENDPOINTS.HISTORY, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : await res.text();

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token_type');
            localStorage.removeItem('user_email');
            navigate('/login');
            return;
          }

          const message =
            typeof payload === 'object' && payload && 'detail' in payload
              ? String((payload as Record<string, unknown>).detail)
              : 'Failed to load analysis history.';
          setError(message);
          return;
        }

        setHistory(Array.isArray(payload) ? (payload as HistoryItem[]) : []);
      } catch {
        setError('Network error. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [navigate]);

  useEffect(() => {
    if (!history.length) return;
    if (!selectedAnalysisId || !history.some((item) => item.analysis_id === selectedAnalysisId)) {
      setSelectedAnalysisId(history[0].analysis_id);
    }
  }, [history, selectedAnalysisId]);

  useEffect(() => {
    const loadSelectedReport = async () => {
      if (!selectedAnalysisId) {
        setSelectedReportDetail(null);
        return;
      }

      setSelectedDetailLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(SCRAPER_ENDPOINTS.REPORT(selectedAnalysisId), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : await res.text();

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token_type');
            localStorage.removeItem('user_email');
            navigate('/login');
            return;
          }
          setSelectedReportDetail(null);
          return;
        }

        setSelectedReportDetail(payload as ReportDetail);
      } catch {
        setSelectedReportDetail(null);
      } finally {
        setSelectedDetailLoading(false);
      }
    };

    loadSelectedReport();
  }, [selectedAnalysisId, navigate]);

  const selectedItem = history.find((item) => item.analysis_id === selectedAnalysisId) || null;
  const selectedRecommendations = selectedReportDetail?.recommendations?.recommendations || [];

  const onImageError = (analysisId: string) => {
    setBrokenImageIds((prev) => ({ ...prev, [analysisId]: true }));
  };

  return (
    <div className="page-section">
      <div className="dashboard-page-layout">
        <div className="page-card dashboard-main-card">
          <div className="auth-form-subtitle">WORKSPACE</div>
          <h2 className="analyze-card-title">Dashboard</h2>
          <div className="auth-form-divider" />
          <p className="analyze-card-description">
            Review your previous analyses and continue where you left off.
          </p>

          <div className="dashboard-toolbar">
            <button className="btn-primary btn-uniform" onClick={() => navigate('/analysis/new')}>
              New Analysis
            </button>
          </div>

          {loading && <div className="analysis-progress-text">Loading analysis history...</div>}
          {!loading && error && <div className="error-bar">{error}</div>}

          {!loading && !error && history.length === 0 && (
            <div className="dashboard-empty-state">
              No analyses yet. Run your first analysis to see report history here.
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="dashboard-history-list">
              {history.map((item) => (
                <div
                  key={item.analysis_id}
                  className={`dashboard-history-item${item.analysis_id === selectedAnalysisId ? ' selected' : ''}`}
                  onClick={() => setSelectedAnalysisId(item.analysis_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedAnalysisId(item.analysis_id);
                    }
                  }}
                >
                  {item.image_url && !brokenImageIds[item.analysis_id] ? (
                    <img
                      className="dashboard-history-image"
                      src={item.image_url}
                      alt={item.title || item.asin}
                      onError={() => onImageError(item.analysis_id)}
                    />
                  ) : (
                    <div className="dashboard-history-image dashboard-history-image-placeholder" />
                  )}

                  <div className="dashboard-history-content">
                    <div className="dashboard-history-head">
                      <div className="dashboard-history-title">{item.title || 'Untitled Product'}</div>
                      {item.analysis_id === selectedAnalysisId && (
                        <span className="dashboard-history-selected-badge">Selected</span>
                      )}
                    </div>
                    <div className="dashboard-history-meta mono">ASIN: {item.asin || '—'}</div>
                    <div className="dashboard-history-stats mono">
                      {asRating(item.rating)} · {asNumber(item.review_count)} reviews · {asPrice(item.price)}
                    </div>
                    <div className="dashboard-history-date">Created {asDate(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="dashboard-summary-card dashboard-summary-side">
            <div className="auth-form-subtitle">SELECTED REPORT</div>
            <h3 className="dashboard-summary-title">{selectedItem.title || 'Untitled Product'}</h3>
            <div className="dashboard-summary-meta mono">ASIN: {selectedItem.asin || '—'}</div>
            <div className="dashboard-summary-date">Created: {new Date(selectedItem.created_at).toLocaleString()}</div>

            {selectedItem.image_url && !brokenImageIds[selectedItem.analysis_id] ? (
              <img
                className="dashboard-summary-image"
                src={selectedItem.image_url}
                alt={selectedItem.title || selectedItem.asin}
                onError={() => onImageError(selectedItem.analysis_id)}
              />
            ) : (
              <div className="dashboard-summary-image dashboard-history-image-placeholder" />
            )}

            <div className="dashboard-summary-stats mono">
              {asRating(selectedItem.rating)} · {asNumber(selectedItem.review_count)} reviews · {asPrice(selectedItem.price)}
            </div>

            <div className="dashboard-summary-rec-section">
              <div className="dashboard-summary-rec-title">Recommendations</div>
              {selectedDetailLoading ? (
                <div className="dashboard-summary-rec-loading">Loading recommendations...</div>
              ) : selectedRecommendations.length > 0 ? (
                <ul className="dashboard-summary-rec-list">
                  {selectedRecommendations.slice(0, 3).map((rec, index) => (
                    <li key={`${rec.title}-${index}`} className="dashboard-summary-rec-item">
                      <span className="dashboard-summary-rec-head">{rec.title}</span>
                      <span className="dashboard-summary-rec-body">{rec.rationale}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-summary-rec-loading">No recommendations available.</div>
              )}
            </div>

            <button
              className="btn-secondary btn-uniform"
              onClick={() => navigate(`/report/${selectedItem.analysis_id}`)}
            >
              Open Detailed Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
