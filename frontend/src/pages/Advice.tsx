import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';

type RecommendationItem = {
  title: string;
  rationale: string;
  priority: string;
};

type ReportAdviceResponse = {
  _id: string;
  recommendations?: {
    summary?: string;
    recommendations?: RecommendationItem[];
  };
};

export default function Advice() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportAdviceResponse | null>(null);

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(SCRAPER_ENDPOINTS.REPORT(id || ''), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('token_type');
          localStorage.removeItem('user_email');
          navigate('/login');
          return;
        }

        const body = await res.json();

        if (!res.ok) {
          throw new Error(body?.detail || 'Failed to load recommendations');
        }

        setReport(body);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchAdvice();
  }, [id, navigate]);

  const items = report?.recommendations?.recommendations || [];

  return (
    <div className="report-page">
      <h1 className="auth-title">AI Recommendations</h1>

      {loading && (
        <div className="page-card report-card report-loading-card">
          <p>Loading recommendations...</p>
        </div>
      )}

      {!loading && error && (
        <div className="page-card report-card report-error-card">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="page-card report-card ai-recommendations-card">
          <div className="auth-form-subtitle">ACTION PLAN</div>
          {report?.recommendations?.summary && (
            <p className="ai-recommendations-summary">{report.recommendations.summary}</p>
          )}

          {items.length === 0 ? (
            <p className="ai-recommendations-summary">No recommendations are available for this report.</p>
          ) : (
            <div className="ai-recommendations-list">
              {items.map((item, index) => (
                <div key={`${item.title}-${index}`} className="ai-recommendation-item">
                  <div className="ai-recommendation-top">
                    <h3 className="ai-recommendation-title">{item.title}</h3>
                    <span className={`ai-priority-badge ${item.priority?.toLowerCase() || 'medium'}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="ai-recommendation-rationale">{item.rationale}</p>
                </div>
              ))}
            </div>
          )}

          <div className="report-actions-row">
            <button className="btn-secondary btn-uniform" onClick={() => navigate(`/report/${id}`)}>
              Back to Product Metrics
            </button>
            <button className="btn-secondary btn-uniform" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
            <button className="btn-primary btn-uniform" onClick={() => navigate('/analysis/new')}>
              Start New Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
