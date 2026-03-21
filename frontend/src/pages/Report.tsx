import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SCRAPER_ENDPOINTS } from '../config';

type ComparisonProduct = {
  asin: string;
  url?: string | null;
  title?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
};

type ReportRecord = {
  _id: string;
  data: ComparisonProduct & {
    competitors?: ComparisonProduct[];
  };
};

const toTitle = (value?: string | null) => {
  const text = (value || '').trim() || 'Untitled Product';
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
};

const metricValue = (value: number | null | undefined, type: 'price' | 'number') => {
  if (value === null || value === undefined) return '—';
  if (type === 'price') return `$${value.toFixed(2)}`;
  return String(value);
};

export const Report: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Session expired. Please sign in again.');
          navigate('/login');
          return;
        }

        const res = await fetch(SCRAPER_ENDPOINTS.REPORT(id), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : await res.text();

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_email');
            navigate('/login');
            return;
          }
          const message =
            typeof payload === 'object' && payload && 'detail' in payload
              ? String((payload as Record<string, unknown>).detail)
              : 'Failed to load report.';
          setError(message);
          return;
        }

        setReport(payload as ReportRecord);
      } catch {
        setError('Network error. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  const products = useMemo(() => {
    if (!report?.data) return [];
    return [report.data, ...(report.data.competitors || [])];
  }, [report]);

  return (
    <div className="page-section">
      <div className="page-card report-card">
        <div className="auth-form-subtitle">REPORT</div>
        <h2 className="analyze-card-title">Competitor Comparison</h2>
        <div className="auth-form-divider" />

        {loading && <div className="analysis-progress-text">Loading report...</div>}
        {error && <div className="error-bar">{error}</div>}

        {!loading && !error && report && (
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {products.map((product, index) => (
                    <th key={`${product.asin}-${index}`} className={index === 0 ? 'seller-col' : ''}>
                      <div className="comparison-header">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title || product.asin} />
                        ) : (
                          <div className="comparison-placeholder" />
                        )}
                        <div className="comparison-header-meta">
                          <span className={index === 0 ? 'comparison-badge source' : 'comparison-badge competitor'}>
                            {index === 0 ? 'Your Product' : 'Competitor'}
                          </span>
                          <span>{toTitle(product.title)}</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ASIN</td>
                  {products.map((product, index) => (
                    <td key={`asin-${product.asin}-${index}`} className={index === 0 ? 'seller-col mono' : 'mono'}>
                      {product.asin ? (
                        product.url ? (
                          <a className="comparison-link" href={product.url} target="_blank" rel="noreferrer">
                            {product.asin}
                          </a>
                        ) : (
                          product.asin
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Price</td>
                  {products.map((product, index) => (
                    <td key={`price-${product.asin}-${index}`} className={index === 0 ? 'seller-col mono' : 'mono'}>
                      {metricValue(product.price, 'price')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Rating</td>
                  {products.map((product, index) => (
                    <td key={`rating-${product.asin}-${index}`} className={index === 0 ? 'seller-col mono' : 'mono'}>
                      {metricValue(product.rating, 'number')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Review Count</td>
                  {products.map((product, index) => (
                    <td key={`reviews-${product.asin}-${index}`} className={index === 0 ? 'seller-col mono' : 'mono'}>
                      {metricValue(product.review_count, 'number')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
