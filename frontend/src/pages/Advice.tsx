import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';
import { downloadReportPdf, type ReportForPdf } from '../utils/reportPdf';

type RecommendationItem = {
  title: string;
  rationale: string;
  priority: string;
};

type CompetitorInfo = {
  asin: string;
  title?: string | null;
  url?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
};

type ReportAdviceResponse = ReportForPdf & {
  _id: string;
  data?: {
    asin?: string;
    title?: string | null;
    url?: string | null;
    price?: number | null;
    rating?: number | null;
    review_count?: number | null;
    image_url?: string | null;
    competitors?: CompetitorInfo[];
  };
  recommendations?: {
    summary?: string;
    recommendations?: RecommendationItem[];
  };
  review_analysis?: {
    overall_sentiment_summary: string;
    what_we_do_well?: string;
    strategies_to_improve?: string;
    competitor_weaknesses?: string;
    overall_sentiment_score?: number;
    competitor_sentiment_scores?: Record<string, number>;
    themes: {
      theme: string;
      description: string;
      sentiment: string;
      prevalence: string;
      actionability: string;
    }[];
  };
};

export default function Advice() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportAdviceResponse | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (!report) return;
    setPdfError(null);
    setIsDownloadingPdf(true);

    try {
      await downloadReportPdf(report);
    } catch {
      setPdfError('Could not generate the PDF report. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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
          <div className="report-download-topbar">
            <div className="auth-form-subtitle" style={{ marginBottom: 0 }}>RECOMMENDED ACTION PLAN</div>
            <button
              className="btn-primary btn-uniform report-download-button"
              onClick={handleDownloadPdf}
              disabled={!report || isDownloadingPdf}
            >
              {isDownloadingPdf ? 'Generating PDF…' : 'Download PDF Report'}
            </button>
          </div>
          {pdfError && <div className="error-bar">{pdfError}</div>}
          {report?.recommendations?.summary && (
            <p className="ai-recommendations-summary">{report.recommendations.summary}</p>
          )}

          {items.length === 0 ? (
            <p className="ai-recommendations-summary">No recommendations are available for this report.</p>
          ) : (
            <div className="ai-recommendations-list">
              {items.map((item, index) => (
                <div key={`rec-${item.title}-${index}`} className="ai-recommendation-item">
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

          {report?.review_analysis && (
            <div className="actionable-themes-section" style={{ marginTop: '3rem' }}>
              <div className="auth-form-subtitle">CUSTOMER SENTIMENT & COMPETITOR SNAPSHOT</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginTop: '1.5rem' }}>
                {/* Bottom Left: Product Sentiment Insights */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 600, color: '#C4A96B', margin: 0 }}>
                      {report.review_analysis.overall_sentiment_score ?? 50}/100
                    </h3>
                    <span className="ai-recommendations-summary" style={{ margin: 0 }}>
                      Overall Sentiment Score
                    </span>
                  </div>
                  <p className="ai-recommendations-summary" style={{ marginBottom: '2rem' }}>
                    {report.review_analysis.overall_sentiment_summary}
                  </p>

                  {report.review_analysis.what_we_do_well && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: '#1B1B18', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 600 }}>Competitive Advantages</h4>
                      <p className="ai-recommendations-rationale" style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#4A463F', margin: 0 }}>
                        {report.review_analysis.what_we_do_well}
                      </p>
                    </div>
                  )}

                  {report.review_analysis.strategies_to_improve && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: '#1B1B18', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 600 }}>Strategies to Improve</h4>
                      <p className="ai-recommendations-rationale" style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#4A463F', margin: 0 }}>
                        {report.review_analysis.strategies_to_improve}
                      </p>
                    </div>
                  )}

                  {report.review_analysis.competitor_weaknesses && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: '#1B1B18', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 600 }}>Competitor Weaknesses</h4>
                      <p className="ai-recommendations-rationale" style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#4A463F', margin: 0 }}>
                        {report.review_analysis.competitor_weaknesses}
                      </p>
                    </div>
                  )}

                  {report.review_analysis.themes && report.review_analysis.themes.length > 0 && !report.review_analysis.what_we_do_well && (
                    <div className="ai-recommendations-list">
                      {report.review_analysis.themes.map((theme, index) => (
                        <div key={`theme-${theme.theme}-${index}`} className="ai-recommendation-item">
                          <div className="ai-recommendation-top">
                            <h3 className="ai-recommendation-title">{theme.theme}</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span className={`ai-priority-badge ${theme.sentiment?.toLowerCase() || 'neutral'}`}>
                                {theme.sentiment}
                              </span>
                              <span className="ai-priority-badge medium">
                                {theme.prevalence} prevalence
                              </span>
                            </div>
                          </div>
                          <p className="ai-recommendation-rationale" style={{ marginBottom: '0.5rem' }}>
                            <strong>Description: </strong>{theme.description}
                          </p>
                          <p className="ai-recommendation-rationale">
                            <strong>Action to Take: </strong>{theme.actionability}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Right: Competitor Bar Chart */}
                <div>
                  <div style={{ background: '#FDFCFB', border: '1px solid #EBE8E1', borderRadius: '8px', padding: '1.5rem', height: '100%' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#1B1B18', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', fontWeight: 600 }}>Sentiment Leaderboard</h4>

                    {report.review_analysis.competitor_sentiment_scores &&
                      Object.keys(report.review_analysis.competitor_sentiment_scores).length > 0 ? (() => {
                        const myScore = report.review_analysis.overall_sentiment_score ?? 50;
                        const competitorMap = report.review_analysis.competitor_sentiment_scores!;
                        const scores = Object.values(competitorMap);
                        const avgCompetitor = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                        const delta = myScore - avgCompetitor;
                        const isAhead = delta > 0;
                        const isTied = delta === 0;

                        const titleMap: Record<string, string> = {};
                        (report.data?.competitors || []).forEach((c) => {
                          if (c.asin) titleMap[c.asin] = c.title || c.asin;
                        });

                        const allEntries = [
                          { key: 'you', label: report.data?.title || 'Your Product', score: myScore, isSelf: true },
                          ...Object.entries(competitorMap).map(([asin, score]) => ({
                            key: asin, label: titleMap[asin] || asin, score, isSelf: false,
                          })),
                        ].sort((a, b) => b.score - a.score);

                        const maxScore = Math.max(...allEntries.map((e) => e.score), 1);

                        return (
                          <div>
                            {/* Headline row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', fontFamily: 'IBM Plex Mono, monospace', color: '#8A7F6A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Competitor Avg</span>
                                <span style={{ fontSize: '1.4rem', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', color: '#8A7F6A' }}>{avgCompetitor}/100</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', fontFamily: 'IBM Plex Mono, monospace', color: '#8A7F6A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>vs You</span>
                                <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: isTied ? '#8A7F6A' : isAhead ? '#4CAF80' : '#C0392B' }}>
                                  {isTied ? '—' : `${isAhead ? '+' : ''}${delta}`}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: '#8A7F6A', maxWidth: '160px', lineHeight: 1.4 }}>
                                {isTied
                                  ? 'Your sentiment matches the competitor average.'
                                  : isAhead
                                    ? `You outperform competitors by ${delta} points.`
                                    : `Competitors lead you by ${Math.abs(delta)} points.`}
                              </span>
                            </div>

                            {/* Bar chart rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {allEntries.map((entry) => (
                                <div key={entry.key} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                  <span title={entry.label} style={{
                                    width: '120px', flexShrink: 0, fontSize: '0.75rem',
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    color: entry.isSelf ? '#C4A96B' : '#8A7F6A',
                                    fontWeight: entry.isSelf ? 600 : 400,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {entry.label.length > 18 ? `${entry.label.slice(0, 18)}…` : entry.label}
                                  </span>
                                  <div style={{ flex: 1, height: '8px', background: '#EBE8E1', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${(entry.score / maxScore) * 100}%`, height: '100%',
                                      background: entry.isSelf ? '#C4A96B' : '#DDD9D0',
                                      borderRadius: '4px', transition: 'width 0.35s ease',
                                    }} />
                                  </div>
                                  <span style={{
                                    width: '35px', flexShrink: 0, textAlign: 'right', fontSize: '0.75rem',
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    color: entry.isSelf ? '#C4A96B' : '#8A7F6A',
                                    fontWeight: entry.isSelf ? 600 : 400,
                                  }}>
                                    {entry.score}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })() : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: '#8A7F6A', fontSize: '0.85rem', textAlign: 'center', maxWidth: '250px', lineHeight: 1.5 }}>
                          Competitor sentiment scores not available for this report. Run a new analysis to generate them.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
