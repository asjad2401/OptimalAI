import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type RecommendationItem = {
  title: string;
  rationale: string;
  priority: string;
};

export type ProductInfo = {
  asin?: string;
  title?: string | null;
  url?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
  image_url?: string | null;
};

export type ReportForPdf = {
  _id: string;
  data?: ProductInfo & {
    competitors?: ProductInfo[];
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

const currency = (value?: number | null) => (typeof value === 'number' ? `$${value.toFixed(2)}` : '—');
const decimal = (value?: number | null) => (typeof value === 'number' ? value.toFixed(1) : '—');
const integer = (value?: number | null) => (typeof value === 'number' ? Math.round(value).toString() : '—');

const average = (values: Array<number | null | undefined>) => {
  const clean = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
};

const fileNameSafe = (value: string) => value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');

const readImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const downloadReportPdf = async (report: ReportForPdf) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const footerHeight = 40;
  const right = pageWidth - margin;
  const usableWidth = pageWidth - margin * 2;
  const generatedAt = new Date();
  const generatedAtText = generatedAt.toLocaleString();
  let y = margin;

  const ensureSpace = (required: number) => {
    if (y + required <= pageHeight - margin - footerHeight) return;
    doc.addPage();
    y = margin;
  };

  const textBlock = (text: string, size = 11, color: [number, number, number] = [74, 70, 63], gap = 8) => {
    if (!text.trim()) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, usableWidth) as string[];
    ensureSpace(lines.length * (size + 2) + gap);
    doc.text(lines, margin, y);
    y += lines.length * (size + 2) + gap;
  };

  const sectionTitle = (title: string) => {
    ensureSpace(30);
    doc.setDrawColor(221, 217, 208);
    doc.line(margin, y, right, y);
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(28, 27, 24);
    doc.text(title, margin, y);
    y += 14;
  };

  const getLastAutoTableY = () => {
    const d = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    return d.lastAutoTable?.finalY || y;
  };

  const drawSentimentCircle = (x: number, centerY: number, score: number, label: string, isSelf = false) => {
    const radius = 36;
    doc.setFillColor(isSelf ? 42 : 220, isSelf ? 97 : 220, isSelf ? 171 : 220);
    doc.circle(x, centerY, radius, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`${Math.round(score)}/100`, x, centerY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(92, 84, 72);
    doc.text(label, x, centerY + radius + 14, { align: 'center' });
  };

  const addKpi = (label: string, value: string, x: number, w: number) => {
    doc.setDrawColor(221, 217, 208);
    doc.roundedRect(x, y, w, 44, 4, 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(92, 84, 72);
    doc.text(label, x + 8, y + 14);
    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(18, 17, 14);
    doc.text(value, x + 8, y + 31);
  };

  const product = report.data;
  const competitors = report.data?.competitors || [];
  const products = [product, ...competitors].filter(Boolean) as ProductInfo[];
  const avgPrice = average(competitors.map((c) => c.price));
  const avgRating = average(competitors.map((c) => c.rating));
  const avgReviews = average(competitors.map((c) => c.review_count));

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(18, 17, 14);
  doc.setFontSize(20);
  doc.text('Product Analysis Report', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(138, 127, 106);
  doc.text(`Analysis ID: ${report._id}`, margin, y + 16);
  doc.text(`Generated: ${generatedAtText}`, margin, y + 30);
  y += 52;

  sectionTitle('1) Product Overview');

  if (product?.image_url) {
    const imageData = await readImageAsDataUrl(product.image_url);
    if (imageData) {
      ensureSpace(90);
      doc.addImage(imageData, 'JPEG', margin, y, 70, 70);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(18, 17, 14);
      doc.text(product.title || 'Your Product', margin + 82, y + 16);
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(92, 84, 72);
      doc.text(`ASIN: ${product.asin || '—'}`, margin + 82, y + 34);
      y += 82;
    }
  }

  if (!product?.image_url) {
    textBlock(product?.title || 'Untitled Product', 12, [18, 17, 14], 4);
    textBlock(`ASIN: ${product?.asin || '—'}`, 10, [92, 84, 72], 10);
  }

  const kpiGap = 10;
  const kpiWidth = (usableWidth - kpiGap * 2) / 3;
  ensureSpace(60);
  addKpi('Price', currency(product?.price), margin, kpiWidth);
  addKpi('Rating', decimal(product?.rating), margin + kpiWidth + kpiGap, kpiWidth);
  addKpi('Review Count', integer(product?.review_count), margin + (kpiWidth + kpiGap) * 2, kpiWidth);
  y += 56;

  ensureSpace(56);
  addKpi('Competitor Avg Price', currency(avgPrice), margin, kpiWidth);
  addKpi('Competitor Avg Rating', decimal(avgRating), margin + kpiWidth + kpiGap, kpiWidth);
  addKpi('Competitor Avg Reviews', integer(avgReviews), margin + (kpiWidth + kpiGap) * 2, kpiWidth);
  y += 60;

  sectionTitle('2) Product & Competitor Metrics');

  const metricRows = products.map((p, i) => {
    const asin = p.asin || '—';
    return {
      role: i === 0 ? 'Your Product' : 'Competitor',
      title: p.title || 'Untitled Product',
      asin,
      asinUrl: p.asin ? `https://www.amazon.com/dp/${p.asin}` : '',
      price: currency(p.price),
      rating: decimal(p.rating),
      reviews: integer(p.review_count),
    };
  });

  autoTable(doc, {
    startY: y,
    head: [['Role', 'Title', 'ASIN (Link)', 'Price', 'Rating', 'Reviews']],
    body: metricRows,
    columns: [
      { header: 'Role', dataKey: 'role' },
      { header: 'Title', dataKey: 'title' },
      { header: 'ASIN (Link)', dataKey: 'asin' },
      { header: 'Price', dataKey: 'price' },
      { header: 'Rating', dataKey: 'rating' },
      { header: 'Reviews', dataKey: 'reviews' },
    ],
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 70 },
      3: { cellWidth: 45 },
      4: { cellWidth: 45 },
      5: { cellWidth: 50 },
    },
    styles: { fontSize: 9, cellPadding: 6, lineColor: [221, 217, 208], lineWidth: 0.5 },
    headStyles: { fillColor: [248, 246, 242], textColor: [28, 27, 24] },
    alternateRowStyles: { fillColor: [252, 251, 249] },
    margin: { left: margin, right: margin, bottom: 40 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.dataKey === 'asin') {
        hookData.cell.text = [''];
      }
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.dataKey !== 'asin') return;

      const raw = hookData.row.raw as { asin?: string; asinUrl?: string };
      const asinText = raw.asin || '—';
      const textX = hookData.cell.x + 6;
      const textY = hookData.cell.y + hookData.cell.height / 2 + 3;

      if (raw.asinUrl && asinText !== '—') {
        doc.setTextColor(42, 97, 171);
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.textWithLink(asinText, textX, textY, { url: raw.asinUrl });
      } else {
        doc.setTextColor(138, 127, 106);
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.text(asinText, textX, textY);
      }
    },
  });

  y = getLastAutoTableY() + 14;

  const analysis = report.review_analysis;
  if (analysis) {
    sectionTitle('3) Customer Sentiment Summary');

    const myScore = analysis.overall_sentiment_score ?? 50;
    const competitorScoreValues = Object.values(analysis.competitor_sentiment_scores || {});
    const competitorAvg = competitorScoreValues.length
      ? Math.round(competitorScoreValues.reduce((a, b) => a + b, 0) / competitorScoreValues.length)
      : null;

    textBlock(`Overall sentiment score: ${myScore}/100`, 11, [18, 17, 14], 6);
    ensureSpace(120);
    const competitorAvgScore = competitorAvg ?? 0;
    const circleY = y + 46;
    drawSentimentCircle(margin + 90, circleY, myScore, 'Your Product', true);
    drawSentimentCircle(margin + 260, circleY, competitorAvgScore, 'Competitor Average', false);
    y += 110;

    if (competitorAvg !== null) {
      textBlock(`Competitor average sentiment: ${competitorAvg}/100`, 11, [18, 17, 14], 6);
      textBlock(`Delta vs competitor average: ${myScore - competitorAvg > 0 ? '+' : ''}${myScore - competitorAvg}`, 11, [18, 17, 14], 10);
    }

    textBlock(analysis.overall_sentiment_summary || '', 10);

    if (analysis.what_we_do_well) {
      textBlock('Competitive Advantages', 10, [28, 27, 24], 4);
      textBlock(analysis.what_we_do_well, 10);
    }

    if (analysis.strategies_to_improve) {
      textBlock('Strategies to Improve', 10, [28, 27, 24], 4);
      textBlock(analysis.strategies_to_improve, 10);
    }

    if (analysis.competitor_weaknesses) {
      textBlock('Competitor Weaknesses', 10, [28, 27, 24], 4);
      textBlock(analysis.competitor_weaknesses, 10);
    }

    sectionTitle('4) Sentiment Leaderboard');

    const titleMap: Record<string, string> = {};
    (report.data?.competitors || []).forEach((c) => {
      if (c.asin) titleMap[c.asin] = c.title || c.asin;
    });

    const leaderboard = [
      { label: report.data?.title || 'Your Product', score: myScore, isSelf: true },
      ...Object.entries(analysis.competitor_sentiment_scores || {}).map(([asin, score]) => ({
        label: titleMap[asin] || asin,
        score,
        isSelf: false,
      })),
    ].sort((a, b) => b.score - a.score);

    ensureSpace(24);
    const axisY = y + 12;
    const barStartX = margin + 190;
    const barMaxW = usableWidth - 240;
    doc.setDrawColor(221, 217, 208);
    doc.line(barStartX, axisY, barStartX + barMaxW, axisY);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(138, 127, 106);
    doc.text('0', barStartX, axisY - 4);
    doc.text('100', barStartX + barMaxW, axisY - 4, { align: 'right' });
    y += 20;

    for (const row of leaderboard) {
      doc.setFont('helvetica', row.isSelf ? 'bold' : 'normal');
      doc.setFontSize(9);
      
      const labelLines = doc.splitTextToSize(row.label, 175) as string[];
      const rowHeight = Math.max(21, labelLines.length * 12 + 4);
      ensureSpace(rowHeight);

      const barX = barStartX;
      const barW = barMaxW;
      const fillW = (Math.max(0, Math.min(100, row.score)) / 100) * barW;

      doc.setTextColor(28, 27, 24);
      doc.text(labelLines, margin, y + 9);

      doc.setFillColor(235, 232, 225);
      doc.roundedRect(barX, y + 2, barW, 9, 2, 2, 'F');
      if (row.isSelf) {
        doc.setFillColor(42, 97, 171); // blue for your product
      } else {
        doc.setFillColor(178, 176, 176); // grey for competitors
      }
      doc.roundedRect(barX, y + 2, fillW, 9, 2, 2, 'F');

      doc.setFont('courier', 'normal');
      doc.setTextColor(18, 17, 14);
      doc.text(`${Math.round(row.score)}`, right - 8, y + 9, { align: 'right' });
      y += rowHeight;
    }
  }

  sectionTitle('5) AI Recommendations & Action Plan');

  if (report.recommendations?.summary) {
    textBlock(report.recommendations.summary, 10);
  }

  const recs = report.recommendations?.recommendations || [];
  if (recs.length) {
    autoTable(doc, {
      startY: y,
      head: [['Priority', 'Recommendation', 'Rationale']],
      body: recs.map((r) => [r.priority || 'Medium', r.title || 'Untitled recommendation', r.rationale || '—']),
      columnStyles: { 0: { cellWidth: 80 } },
      styles: { fontSize: 9, cellPadding: 6, lineColor: [221, 217, 208], lineWidth: 0.5 },
      headStyles: { fillColor: [248, 246, 242], textColor: [28, 27, 24] },
      margin: { left: margin, right: margin, bottom: 40 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          hookData.cell.text = [''];
        }
      },
      didDrawCell: (hookData) => {
        if (hookData.section !== 'body' || hookData.column.index !== 0) return;
        const row = hookData.row.raw as string[];
        const priorityRaw = (row?.[0] || 'medium').toLowerCase();
        const label = priorityRaw === 'high' ? 'HIGH' : priorityRaw === 'low' ? 'LOW' : 'MEDIUM';

        const map: Record<string, { fill: [number, number, number]; text: [number, number, number] }> = {
          high: { fill: [253, 230, 230], text: [173, 43, 43] },
          medium: { fill: [255, 244, 214], text: [140, 98, 0] },
          low: { fill: [228, 247, 234], text: [24, 128, 56] },
        };
        const palette = map[priorityRaw] || map.medium;

        const pillX = hookData.cell.x + 6;
        const pillY = hookData.cell.y + hookData.cell.height / 2 - 7;
        const pillW = 68;
        const pillH = 14;

        doc.setFillColor(...palette.fill);
        doc.roundedRect(pillX, pillY, pillW, pillH, 7, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...palette.text);
        doc.text(label, pillX + pillW / 2, pillY + 9, { align: 'center' });
      },
    });
    y = getLastAutoTableY() + 10;
  } else {
    textBlock('No recommendations were available for this analysis.', 10);
  }

  if (report.review_analysis?.themes?.length) {
    sectionTitle('6) Actionable Sentiment Themes');
    autoTable(doc, {
      startY: y,
      head: [['Theme', 'Sentiment', 'Prevalence', 'Suggested Action']],
      body: report.review_analysis.themes.map((t) => [t.theme, t.sentiment, t.prevalence, t.actionability]),
      columnStyles: { 1: { cellWidth: 70 }, 2: { cellWidth: 70 } },
      styles: { fontSize: 9, cellPadding: 6, lineColor: [221, 217, 208], lineWidth: 0.5 },
      headStyles: { fillColor: [248, 246, 242], textColor: [28, 27, 24] },
      margin: { left: margin, right: margin, bottom: 40 },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
    });
    y = getLastAutoTableY() + 10;
  }

  ensureSpace(24);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(92, 84, 72);
  doc.text('End of Report', margin, y + 10);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(221, 217, 208);
    doc.line(margin, pageHeight - footerHeight, right, pageHeight - footerHeight);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(138, 127, 106);
    doc.text(`Analysis ID: ${report._id}`, margin, pageHeight - 10);
    doc.text(`Generated: ${generatedAtText}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, right, pageHeight - 10, { align: 'right' });
  }

  const fileBase = fileNameSafe(product?.asin || product?.title || report._id || 'report');
  doc.save(`report-${fileBase}.pdf`);
};
