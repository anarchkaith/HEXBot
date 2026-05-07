function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
}

function normalizeAnalysis(analysis = {}) {
  if (!analysis || typeof analysis !== 'object') return {};

  return {
    summary: typeof analysis.summary === 'string' ? analysis.summary.trim() : '',
    recommendation: typeof analysis.recommendation === 'string' ? analysis.recommendation.trim() : '',
    reason: typeof analysis.reason === 'string' ? analysis.reason.trim() : '',
    operationalRecommendation: typeof analysis.operationalRecommendation === 'string' ? analysis.operationalRecommendation.trim() : '',
    tacticalDirective: typeof analysis.tacticalDirective === 'string' ? analysis.tacticalDirective.trim() : '',
    threatLevel: typeof analysis.threatLevel === 'string' ? analysis.threatLevel.trim() : '',
    confidence: typeof analysis.confidence === 'number' || typeof analysis.confidence === 'string' ? analysis.confidence : null,
    corruptionPercent: typeof analysis.corruptionPercent === 'number' || typeof analysis.corruptionPercent === 'string'
      ? analysis.corruptionPercent
      : null,
    corruptionReason: typeof analysis.corruptionReason === 'string' ? analysis.corruptionReason.trim() : ''
  };
}

function normalizeReportDetails(report = {}) {
  if (!report || typeof report !== 'object') {
    return {
      categories: [],
      tags: [],
      contacto: '',
      severity: '',
      analysis: {}
    };
  }

  return {
    categories: normalizeStringArray(report.categories),
    tags: normalizeStringArray(report.tags),
    contacto: typeof report.contacto === 'string' ? report.contacto.trim() : '',
    severity: typeof report.severity === 'string' ? report.severity.trim().toLowerCase() : '',
    analysis: normalizeAnalysis(report.analysis)
  };
}

function extractReportDetailsFromPayload(payload = {}) {
  const nestedReport = payload.report && typeof payload.report === 'object' && !Array.isArray(payload.report)
    ? payload.report
    : {};

  return normalizeReportDetails({
    categories: nestedReport.categories ?? payload.categories,
    tags: nestedReport.tags ?? payload.tags,
    contacto: nestedReport.contacto ?? payload.contacto,
    severity: nestedReport.severity ?? payload.severity,
    analysis: nestedReport.analysis ?? payload.analysis
  });
}

module.exports = {
  normalizeReportDetails,
  extractReportDetailsFromPayload
};
