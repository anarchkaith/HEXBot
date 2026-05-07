function extractJsonBlock(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function pickFirstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

function pickFirstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }
  return [];
}

function normalizeAiReportPayload(payload = {}) {
  const analysis = payload.analysis && typeof payload.analysis === 'object' ? payload.analysis : {};
  const policia = payload.policia && typeof payload.policia === 'object' ? payload.policia : {};
  const tactica = payload.tactica && typeof payload.tactica === 'object' ? payload.tactica : {};

  return {
    categories: normalizeStringArray(pickFirstArray(payload.categories, payload.categorias, analysis.categories, analysis.categorias)),
    tags: normalizeStringArray(pickFirstArray(payload.tags, payload.etiquetas, analysis.tags, analysis.etiquetas)),
    severity: pickFirstString(payload.severity, payload.severidad, analysis.severity, analysis.severidad).toLowerCase(),
    analysis: {
      summary: pickFirstString(payload.summary, payload.resumen, analysis.summary, analysis.resumen, policia.summary, policia.resumen),
      recommendation: pickFirstString(
        payload.recommendation,
        payload.recomendacion,
        analysis.recommendation,
        analysis.recomendacion,
        tactica.recommendation,
        tactica.recomendacion
      ),
      reason: pickFirstString(
        payload.reason,
        payload.fundamento,
        payload.fundamentoIa,
        analysis.reason,
        analysis.fundamento,
        analysis.fundamentoIa,
        policia.reason,
        policia.fundamento
      ),
      operationalRecommendation: pickFirstString(
        payload.operationalRecommendation,
        payload.recomendacionOperativa,
        analysis.operationalRecommendation,
        analysis.recomendacionOperativa
      ),
      tacticalDirective: pickFirstString(
        payload.tacticalDirective,
        payload.directivaTactica,
        analysis.tacticalDirective,
        analysis.directivaTactica,
        tactica.directive,
        tactica.directiva
      ),
      threatLevel: pickFirstString(payload.threatLevel, payload.nivelAmenaza, analysis.threatLevel, analysis.nivelAmenaza),
      confidence: pickFirstValue(payload.confidence, payload.confianza, analysis.confidence, analysis.confianza),
      corruptionPercent: pickFirstValue(
        payload.corruptionPercent,
        payload.nivelCorrupcion,
        payload.corruption,
        analysis.corruptionPercent,
        analysis.nivelCorrupcion,
        analysis.corruption
      ),
      corruptionReason: pickFirstString(
        payload.corruptionReason,
        payload.fundamentoCorrupcion,
        analysis.corruptionReason,
        analysis.fundamentoCorrupcion
      )
    }
  };
}

module.exports = {
  extractJsonBlock,
  normalizeAiReportPayload
};
