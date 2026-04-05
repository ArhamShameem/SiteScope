const { body } = require('express-validator');

const asyncHandler = require('../middleware/asyncHandler');
const Report = require('../models/Report');

const TITLE_RECOMMENDED_MIN = 30;
const TITLE_RECOMMENDED_MAX = 60;
const META_RECOMMENDED_MIN = 70;
const META_RECOMMENDED_MAX = 160;

const analysisValidation = [
  body('url')
    .trim()
    .notEmpty()
    .withMessage('Website URL is required')
    .custom((value) => {
      try {
        const candidate = value.startsWith('http') ? value : `https://${value}`;
        const parsed = new URL(candidate);

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Only HTTP and HTTPS URLs are allowed');
        }

        return true;
      } catch {
        throw new Error('Enter a valid website URL');
      }
    }),
];

function normalizeUrl(input) {
  return input.startsWith('http://') || input.startsWith('https://')
    ? input
    : `https://${input}`;
}

function extractFirstMatch(html, pattern) {
  const match = html.match(pattern);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

function extractAllMatches(html, pattern) {
  return [...html.matchAll(pattern)].map((match) =>
    match[1].replace(/\s+/g, ' ').trim()
  );
}

function parseHtmlAnalysis(html) {
  const title = extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = extractFirstMatch(
    html,
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
  );
  const headings = {
    h1: extractAllMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    h2: extractAllMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
  };

  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imagesWithoutAlt = imageTags.filter((match) => {
    const tag = match[0];
    const altMatch = tag.match(/\balt\s*=\s*["']([\s\S]*?)["']/i);

    return !altMatch || !altMatch[1].trim();
  }).length;

  return {
    title,
    metaDescription,
    headings,
    imageCount: imageTags.length,
    imagesWithoutAlt,
    pageSizeBytes: Buffer.byteLength(html, 'utf8'),
  };
}

function scoreMetaPresence(value, min, max) {
  if (!value) {
    return 0;
  }

  if (value.length >= min && value.length <= max) {
    return 100;
  }

  return 60;
}

function createSeoChecks(parsed) {
  return [
    {
      label: 'Title tag',
      status: parsed.title ? 'pass' : 'fail',
      details: parsed.title
        ? `Found title (${parsed.title.length} characters)`
        : 'Missing title tag',
    },
    {
      label: 'Meta description',
      status: parsed.metaDescription ? 'pass' : 'fail',
      details: parsed.metaDescription
        ? `Found description (${parsed.metaDescription.length} characters)`
        : 'Missing meta description',
    },
    {
      label: 'Heading structure',
      status: parsed.headings.h1.length === 1 ? 'pass' : 'warn',
      details:
        parsed.headings.h1.length === 1
          ? 'Exactly one H1 found'
          : `Found ${parsed.headings.h1.length} H1 tags`,
    },
    {
      label: 'Image alt text',
      status: parsed.imagesWithoutAlt === 0 ? 'pass' : 'warn',
      details:
        parsed.imageCount === 0
          ? 'No images found on the page'
          : `${parsed.imagesWithoutAlt} of ${parsed.imageCount} images are missing alt text`,
    },
  ];
}

function createRecommendations(parsed, lighthouse) {
  const recommendations = [];

  if (!parsed.title) {
    recommendations.push(
      'Add a descriptive title tag so search engines can understand the page.'
    );
  } else if (
    parsed.title.length < TITLE_RECOMMENDED_MIN ||
    parsed.title.length > TITLE_RECOMMENDED_MAX
  ) {
    recommendations.push(
      'Keep the title tag between 30 and 60 characters for better SERP display.'
    );
  }

  if (!parsed.metaDescription) {
    recommendations.push(
      'Add a meta description to improve click-through rate from search results.'
    );
  } else if (
    parsed.metaDescription.length < META_RECOMMENDED_MIN ||
    parsed.metaDescription.length > META_RECOMMENDED_MAX
  ) {
    recommendations.push(
      'Keep the meta description between 70 and 160 characters.'
    );
  }

  if (parsed.headings.h1.length !== 1) {
    recommendations.push(
      'Use exactly one H1 heading to define the main topic of the page.'
    );
  }

  if (parsed.imagesWithoutAlt > 0) {
    recommendations.push(
      'Add meaningful alt text to images for accessibility and image SEO.'
    );
  }

  if ((lighthouse?.['largest-contentful-paint']?.numericValue || 0) > 2500) {
    recommendations.push(
      'Improve Largest Contentful Paint by reducing render-blocking resources and optimizing media.'
    );
  }

  if ((lighthouse?.['cumulative-layout-shift']?.numericValue || 0) > 0.1) {
    recommendations.push(
      'Reduce layout shifts by reserving space for images, embeds, and dynamic content.'
    );
  }

  if ((lighthouse?.['server-response-time']?.numericValue || 0) > 600) {
    recommendations.push(
      'Reduce server response time to improve load speed and crawl efficiency.'
    );
  }

  return recommendations;
}

function formatMetric(metric, transform = (value) => value) {
  if (metric == null || Number.isNaN(metric)) {
    return null;
  }

  return transform(metric);
}

async function fetchPageSpeed(url) {
  const endpoint = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  );
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.append('category', 'seo');
  endpoint.searchParams.set('strategy', 'mobile');

  if (process.env.PAGESPEED_API_KEY) {
    endpoint.searchParams.set('key', process.env.PAGESPEED_API_KEY);
  }

  const response = await fetch(endpoint.toString());

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`PageSpeed request failed: ${errorText}`);
    error.statusCode = 502;
    throw error;
  }

  return response.json();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SEO-Geo-Analyzer/1.0',
    },
  });

  if (!response.ok) {
    const error = new Error(
      `Failed to fetch website HTML (${response.status})`
    );
    error.statusCode = 502;
    throw error;
  }

  return response.text();
}

function createReportPayload(
  normalizedUrl,
  parsedHtml,
  lighthouse,
  categories,
  loadingExperience
) {
  const performanceScore = Math.round(
    (categories.performance?.score || 0) * 100
  );
  const pageSpeedSeoScore = Math.round((categories.seo?.score || 0) * 100);

  const contentSeoScore = Math.round(
    (scoreMetaPresence(
      parsedHtml.title,
      TITLE_RECOMMENDED_MIN,
      TITLE_RECOMMENDED_MAX
    ) +
      scoreMetaPresence(
        parsedHtml.metaDescription,
        META_RECOMMENDED_MIN,
        META_RECOMMENDED_MAX
      ) +
      (parsedHtml.headings.h1.length === 1 ? 100 : 50) +
      (parsedHtml.imagesWithoutAlt === 0
        ? 100
        : Math.max(40, 100 - parsedHtml.imagesWithoutAlt * 12))) /
      4
  );

  const seoScore = Math.round((pageSpeedSeoScore + contentSeoScore) / 2);
  const audits = createSeoChecks(parsedHtml);
  const issues = audits
    .filter((item) => item.status !== 'pass')
    .map((item) => item.details);
  const suggestions = createRecommendations(parsedHtml, lighthouse);

  return {
    url: normalizedUrl,
    scannedAt: new Date().toISOString(),
    performanceScore,
    seoScore,
    pageSpeedSeoScore,
    contentSeoScore,
    overview: {
      title: parsedHtml.title,
      metaDescription: parsedHtml.metaDescription,
      headingStructure: parsedHtml.headings,
      imageCount: parsedHtml.imageCount,
      imagesWithoutAlt: parsedHtml.imagesWithoutAlt,
      pageSizeBytes: parsedHtml.pageSizeBytes,
      loadTimeMs:
        lighthouse.interactive?.numericValue ||
        lighthouse['speed-index']?.numericValue ||
        null,
    },
    coreWebVitals: {
      lcp: formatMetric(
        loadingExperience.LARGEST_CONTENTFUL_PAINT_MS?.percentile ??
          lighthouse['largest-contentful-paint']?.numericValue,
        (value) => Math.round(value)
      ),
      fcp: formatMetric(
        lighthouse['first-contentful-paint']?.numericValue,
        (value) => Math.round(value)
      ),
      cls: formatMetric(
        loadingExperience.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
          ? loadingExperience.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : lighthouse['cumulative-layout-shift']?.numericValue,
        (value) => Number(value.toFixed(2))
      ),
      inp: formatMetric(
        loadingExperience.INTERACTION_TO_NEXT_PAINT?.percentile ??
          lighthouse.interactive?.numericValue,
        (value) => Math.round(value)
      ),
      ttfb: formatMetric(
        loadingExperience.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ??
          lighthouse['server-response-time']?.numericValue,
        (value) => Math.round(value)
      ),
    },
    audits,
    issues,
    suggestions,
  };
}

function serializeHistoryEntry(entry) {
  return {
    id: entry._id.toString(),
    url: entry.url,
    createdAt: entry.createdAt,
    report: entry.report,
  };
}

const analyzeWebsite = asyncHandler(async (req, res) => {
  const normalizedUrl = normalizeUrl(req.body.url);

  const [pageSpeedData, html] = await Promise.all([
    fetchPageSpeed(normalizedUrl),
    fetchHtml(normalizedUrl),
  ]);

  const parsedHtml = parseHtmlAnalysis(html);
  const lighthouse = pageSpeedData.lighthouseResult?.audits || {};
  const categories = pageSpeedData.lighthouseResult?.categories || {};
  const loadingExperience = pageSpeedData.loadingExperience?.metrics || {};
  const report = createReportPayload(
    normalizedUrl,
    parsedHtml,
    lighthouse,
    categories,
    loadingExperience
  );
  const savedEntry = await Report.create({
    user: req.user._id,
    url: normalizedUrl,
    report,
  });

  res.json({
    report,
    savedReport: serializeHistoryEntry(savedEntry),
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const reports = await Report.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    history: reports.map(serializeHistoryEntry),
  });
});

const deleteHistoryItem = asyncHandler(async (req, res) => {
  const deletedEntry = await Report.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!deletedEntry) {
    const error = new Error('History entry not found');
    error.statusCode = 404;
    throw error;
  }

  res.json({ message: 'History entry deleted' });
});

const deleteAllHistory = asyncHandler(async (req, res) => {
  await Report.deleteMany({ user: req.user._id });
  res.json({ message: 'All history deleted' });
});

module.exports = {
  analysisValidation,
  analyzeWebsite,
  getHistory,
  deleteHistoryItem,
  deleteAllHistory,
};
