import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

const toChartLabel = (title?: string | null, asin?: string | null) => {
  const base = (title || '').trim();
  if (base) {
    return base.length > 30 ? `${base.slice(0, 30)}...` : base;
  }
  const asinText = (asin || '').trim();
  return asinText.length > 30 ? `${asinText.slice(0, 30)}...` : asinText || 'Product';
};

const metricValue = (value: number | null | undefined, type: 'price' | 'number') => {
  if (value === null || value === undefined) return '—';
  if (type === 'price') return `$${value.toFixed(2)}`;
  return String(value);
};

const starsValue = (rating: number | null | undefined) => {
  if (rating === null || rating === undefined) return '—';
  return `★ ${rating.toFixed(1)}`;
};

const averageOf = (values: Array<number | null | undefined>) => {
  const clean = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
};

const formatDelta = (delta: number, type: 'price' | 'rating' | 'review_count') => {
  const abs = Math.abs(delta);
  if (type === 'price') return `$${abs.toFixed(2)}`;
  if (type === 'rating') return abs.toFixed(1);
  return String(Math.round(abs));
};

const trendAgainstAverage = (
  value: number | null | undefined,
  average: number | null | undefined,
  type: 'price' | 'rating' | 'review_count',
  betterWhen: 'higher' | 'lower'
) => {
  if (value === null || value === undefined || average === null || average === undefined) {
    return null;
  }

  const delta = value - average;
  if (Math.abs(delta) < 0.0001) {
    return {
      tone: 'neutral',
      arrow: '→',
      label: 'At category average',
    };
  }

  const isBetter = betterWhen === 'higher' ? delta > 0 : delta < 0;
  const isAbove = delta > 0;

  return {
    tone: isBetter ? 'up' : 'down',
    arrow: isAbove ? '↑' : '↓',
    label: `${isAbove ? 'Above' : 'Below'} avg by ${formatDelta(delta, type)}`,
  };
};

export const Report: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'price' | 'rating' | 'review_count'>('price');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

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
        const parsed = payload as ReportRecord;
        localStorage.setItem(
          'latest_report_snapshot',
          JSON.stringify({
            analysisId: id,
            title: parsed.data?.title,
            asin: parsed.data?.asin,
            image_url: parsed.data?.image_url,
            price: parsed.data?.price,
            rating: parsed.data?.rating,
            review_count: parsed.data?.review_count,
          })
        );
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

  const seller = report?.data;

  const chartData = useMemo(
    () =>
      products.map((product, index) => ({
        label: toChartLabel(product.title, product.asin),
        asin: product.asin || '',
        title: product.title || 'Untitled Product',
        price: product.price ?? null,
        rating: product.rating ?? null,
        review_count: product.review_count ?? null,
        isSeller: index === 0,
      })),
    [products]
  );

  const categoryAverages = useMemo(() => {
    const competitors = products.slice(1);
    return {
      price: averageOf(competitors.map((item) => item.price)),
      rating: averageOf(competitors.map((item) => item.rating)),
      review_count: averageOf(competitors.map((item) => item.review_count)),
    };
  }, [products]);

  const starsTrend = trendAgainstAverage(seller?.rating, categoryAverages.rating, 'rating', 'higher');
  const reviewsTrend = trendAgainstAverage(
    seller?.review_count,
    categoryAverages.review_count,
    'review_count',
    'higher'
  );
  const priceTrend = trendAgainstAverage(seller?.price, categoryAverages.price, 'price', 'lower');

  const ratingDomain = useMemo<[number, number]>(() => {
    const values = chartData
      .map((item) => item.rating)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (values.length === 0) return [0, 5];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const center = (min + max) / 2;

    // Keep a minimum visible spread so close ratings don't look identical.
    const span = Math.max(max - min, 0.8);
    const half = span / 2;

    const lower = Math.max(0, +(center - half).toFixed(2));
    const upper = Math.min(5, +(center + half).toFixed(2));

    return [lower, upper];
  }, [chartData]);

  return (
    <div className="page-section">
      {!loading && !error && seller && (
        <div className="page-card report-card my-product-card">
          <div className="auth-form-subtitle">MY PRODUCT</div>
          <div className="my-product-layout">
            {seller.image_url ? (
              <img className="my-product-image" src={seller.image_url} alt={seller.title || seller.asin} />
            ) : (
              <div className="my-product-image my-product-image-placeholder" />
            )}

            <div className="my-product-details">
              <h2 className="my-product-title">{seller.title || 'Untitled Product'}</h2>
              <div className="my-product-asin-row">
                <span className="my-product-label">ASIN:</span>
                {seller.url ? (
                  <a className="comparison-link" href={seller.url} target="_blank" rel="noreferrer">
                    {seller.asin || '—'}
                  </a>
                ) : (
                  <span className="my-product-value mono">{seller.asin || '—'}</span>
                )}
              </div>

              <div className="my-product-metrics">
                <div className="my-product-metric-item">
                  <span className="my-product-label">Stars</span>
                  <span className="my-product-value mono">{starsValue(seller.rating)}</span>
                  <span className="my-product-average mono">Avg: {starsValue(categoryAverages.rating)}</span>
                  {starsTrend && (
                    <span className={`my-product-trend ${starsTrend.tone}`}>
                      <span className="my-product-trend-arrow">{starsTrend.arrow}</span>
                      {starsTrend.label}
                    </span>
                  )}
                </div>
                <div className="my-product-metric-item">
                  <span className="my-product-label">Reviews</span>
                  <span className="my-product-value mono">{metricValue(seller.review_count, 'number')}</span>
                  <span className="my-product-average mono">Avg: {metricValue(categoryAverages.review_count, 'number')}</span>
                  {reviewsTrend && (
                    <span className={`my-product-trend ${reviewsTrend.tone}`}>
                      <span className="my-product-trend-arrow">{reviewsTrend.arrow}</span>
                      {reviewsTrend.label}
                    </span>
                  )}
                </div>
                <div className="my-product-metric-item">
                  <span className="my-product-label">Price</span>
                  <span className="my-product-value mono">{metricValue(seller.price, 'price')}</span>
                  <span className="my-product-average mono">Avg: {metricValue(categoryAverages.price, 'price')}</span>
                  {priceTrend && (
                    <span className={`my-product-trend ${priceTrend.tone}`}>
                      <span className="my-product-trend-arrow">{priceTrend.arrow}</span>
                      {priceTrend.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-card report-card">
        <div className="auth-form-subtitle">REPORT</div>
        <h2 className="analyze-card-title">Competitor Comparison</h2>
        <div className="auth-form-divider" />

        {loading && <div className="analysis-progress-text">Loading report...</div>}
        {error && <div className="error-bar">{error}</div>}

        {!loading && !error && report && (
          <div>
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

            <div className="category-averages-panel">
              <div className="category-averages-title">Category Averages</div>
              <div className="category-averages-grid">
                <div className="category-avg-item">
                  <span className="category-avg-label">Price</span>
                  <span className="category-avg-value mono">{metricValue(categoryAverages.price, 'price')}</span>
                </div>
                <div className="category-avg-item">
                  <span className="category-avg-label">Rating</span>
                  <span className="category-avg-value mono">{starsValue(categoryAverages.rating)}</span>
                </div>
                <div className="category-avg-item">
                  <span className="category-avg-label">Review Count</span>
                  <span className="category-avg-value mono">{metricValue(categoryAverages.review_count, 'number')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && !error && report && (
        <div className="page-card report-card visual-comparison-card">
          <div className="auth-form-subtitle">VISUAL COMPARISON</div>
          <div className="metric-selector" role="tablist" aria-label="Metric selection">
            <button
              type="button"
              className={`metric-selector-btn${selectedMetric === 'price' ? ' active' : ''}`}
              onClick={() => setSelectedMetric('price')}
            >
              Price
            </button>
            <button
              type="button"
              className={`metric-selector-btn${selectedMetric === 'rating' ? ' active' : ''}`}
              onClick={() => setSelectedMetric('rating')}
            >
              Rating
            </button>
            <button
              type="button"
              className={`metric-selector-btn${selectedMetric === 'review_count' ? ' active' : ''}`}
              onClick={() => setSelectedMetric('review_count')}
            >
              Review Count
            </button>
          </div>

          <h3 className="visual-chart-title">
            {selectedMetric === 'price'
              ? 'Price'
              : selectedMetric === 'rating'
                ? 'Rating'
                : 'Review Count'}
          </h3>
          <div className="visual-chart-canvas">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#DDD9D0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fill: '#8A7F6A' }}
                  axisLine={{ stroke: '#DDD9D0' }}
                  tickLine={{ stroke: '#DDD9D0' }}
                />
                <YAxis
                  tick={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fill: '#8A7F6A' }}
                  axisLine={{ stroke: '#DDD9D0' }}
                  tickLine={{ stroke: '#DDD9D0' }}
                  domain={selectedMetric === 'rating' ? ratingDomain : undefined}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(196, 169, 107, 0.08)' }}
                  contentStyle={{ border: '0.5px solid #DDD9D0', borderRadius: '4px', fontSize: '12px' }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { title?: string; asin?: string } | undefined;
                    if (!row) return '';
                    return `${row.title || 'Untitled Product'} (${row.asin || '—'})`;
                  }}
                />
                <Bar dataKey={selectedMetric} radius={[4, 4, 0, 0]} onMouseLeave={() => setHoveredBarIndex(null)}>
                  {chartData.map((entry, index) => {
                    const base = entry.isSeller ? '#C4A96B' : '#DDD9D0';
                    const hover = entry.isSeller ? '#B89756' : '#CBC4B6';
                    return (
                      <Cell
                        key={`metric-cell-${index}`}
                        fill={hoveredBarIndex === index ? hover : base}
                        onMouseEnter={() => setHoveredBarIndex(index)}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && !error && report && (
        <div className="report-next-row">
          <button className="btn-secondary btn-uniform" onClick={() => navigate('/dashboard')}>
            Back
          </button>
          <button className="btn-primary btn-uniform" onClick={() => navigate(`/report/${id}/advice`)}>
            Next: AI Recommendations
          </button>
        </div>
      )}
    </div>
  );
};
