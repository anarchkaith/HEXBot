const { normalizeReportDetails } = require('../utils/reportDetails');
const { extractJsonBlock, normalizeAiReportPayload } = require('../utils/aiReportParser');
const { errorAi, logAi, warnAi } = require('../utils/aiLogger');

function needsAiEnrichment(reportDetails) {
  const normalized = normalizeReportDetails(reportDetails);
  const analysis = normalized.analysis || {};

  return !(
    normalized.categories.length > 0 &&
    normalized.tags.length > 0 &&
    normalized.severity &&
    analysis.summary &&
    analysis.reason &&
    (analysis.recommendation || analysis.operationalRecommendation) &&
    (analysis.corruptionPercent !== null && analysis.corruptionPercent !== '')
  );
}

function mergeNonEmpty(currentValue, incomingValue) {
  if (Array.isArray(currentValue) || Array.isArray(incomingValue)) {
    const current = Array.isArray(currentValue) ? currentValue : [];
    const incoming = Array.isArray(incomingValue) ? incomingValue : [];
    return Array.from(new Set([...current, ...incoming].filter(Boolean)));
  }

  if (incomingValue === null || incomingValue === undefined || incomingValue === '') {
    return currentValue;
  }

  return incomingValue;
}

function mergeReportDetails(baseDetails, aiDetails, correlationData) {
  const base = normalizeReportDetails(baseDetails);
  const incoming = normalizeAiReportPayload(aiDetails);
  const correlations = Array.isArray(correlationData?.correlations) ? correlationData.correlations.filter(Boolean) : [];
  const correlationConclusion = typeof correlationData?.conclusion === 'string' ? correlationData.conclusion.trim() : '';

  return normalizeReportDetails({
    categories: mergeNonEmpty(base.categories, incoming.categories),
    tags: mergeNonEmpty(base.tags, incoming.tags),
    contacto: base.contacto,
    severity: mergeNonEmpty(base.severity, incoming.severity),
    analysis: {
      summary: mergeNonEmpty(base.analysis.summary, incoming.analysis.summary || correlationConclusion),
      recommendation: mergeNonEmpty(base.analysis.recommendation, incoming.analysis.recommendation),
      reason: mergeNonEmpty(
        base.analysis.reason,
        [incoming.analysis.reason, ...correlations].filter(Boolean).join(' | ')
      ),
      operationalRecommendation: mergeNonEmpty(
        base.analysis.operationalRecommendation,
        incoming.analysis.operationalRecommendation || incoming.analysis.recommendation
      ),
      tacticalDirective: mergeNonEmpty(base.analysis.tacticalDirective, incoming.analysis.tacticalDirective),
      threatLevel: mergeNonEmpty(base.analysis.threatLevel, incoming.analysis.threatLevel),
      confidence: mergeNonEmpty(base.analysis.confidence, incoming.analysis.confidence),
      corruptionPercent: mergeNonEmpty(base.analysis.corruptionPercent, incoming.analysis.corruptionPercent),
      corruptionReason: mergeNonEmpty(base.analysis.corruptionReason, incoming.analysis.corruptionReason || correlationConclusion)
    }
  });
}

function buildReportPrompt(reportPayload) {
  return [
    'Genera un informe policial/tactico del usuario reportado y responde SOLO con JSON valido.',
    'No uses markdown ni texto adicional fuera del JSON.',
    'Usa espanol neutro y frases breves, accionables y sin relleno.',
    'Campos obligatorios del JSON:',
    '{',
    '  "summary": "string",',
    '  "recommendation": "string",',
    '  "reason": "string",',
    '  "tacticalDirective": "Staff: accion breve. Miembros: accion breve.",',
    '  "threatLevel": "low|medium|high|critical|inviable",',
    '  "confidence": "number o string breve",',
    '  "corruptionPercent": "integer 1-100 (NO uses rangos como 0-100 ni texto adicional)",',
    '  "corruptionReason": "string breve",',
    '  "severity": "baja|media|alta|critica|inviable",',
    '  "categories": ["string"],',
    '  "tags": ["string"]',
    '}',
    'Datos del reporte:',
    JSON.stringify(reportPayload, null, 2)
  ].join('\n');
}

function canCall(client, methodName) {
  return client && typeof client[methodName] === 'function' && client[methodName]();
}

class AiReportEnrichmentService {
  constructor(aiClient) {
    this.aiClient = aiClient;
  }

  async enrichReportDetails({ reportId, username, reason, reportDetails, reporterTag, timestamp }) {
    const normalized = normalizeReportDetails(reportDetails);
    if (!this.aiClient) {
      warnAi('enrichment skipped: client unavailable', { reportId, username });
      return normalized;
    }

    if (!needsAiEnrichment(normalized)) {
      logAi('enrichment skipped: report already has required fields', {
        reportId,
        username,
        categories: normalized.categories.length,
        tags: normalized.tags.length,
        severity: normalized.severity || 'none'
      });
      return normalized;
    }

    logAi('enrichment start', {
      reportId,
      username,
      categories: normalized.categories.length,
      tags: normalized.tags.length,
      severity: normalized.severity || 'none'
    });

    const reportPayload = {
      id: reportId,
      usuario: username,
      categoria: normalized.categories.join(', ') || 'sin_categoria',
      severidad: normalized.severity || 'media',
      motivo: reason,
      fecha: timestamp instanceof Date ? timestamp.toISOString() : `${timestamp}`,
      validacion: 'pendiente',
      etiquetas: normalized.tags
    };

    let correlationData = null;
    if (canCall(this.aiClient, 'hasCorrelationEndpoint')) {
      try {
        correlationData = await this.aiClient.correlateReport(username, reportPayload);
        logAi('correlation resolved', {
          reportId,
          username,
          correlations: Array.isArray(correlationData?.correlations) ? correlationData.correlations.length : 0,
          globalRisk: correlationData?.globalRisk ?? 'n/a'
        });
      } catch (error) {
        warnAi('correlation unavailable', {
          reportId,
          username,
          status: error.response?.status || 'network',
          message: error.response?.data?.error || error.message
        });
      }
    } else {
      logAi('correlation skipped: endpoint unavailable', { reportId, username });
    }

    const prompt = buildReportPrompt({
      report: reportPayload,
      reporter: reporterTag || 'unknown',
      reportDetails: normalized,
      correlation: correlationData || null
    });

    let aiText = '';
    try {
      if (!canCall(this.aiClient, 'hasGenerateEndpoint')) {
        throw new Error('Generate endpoint is not configured');
      }

      aiText = await this.aiClient.generate(prompt);
    } catch (error) {
      warnAi('generate unavailable, trying chat fallback', {
        reportId,
        username,
        status: error.response?.status || 'network',
        message: error.response?.data?.error || error.message
      });
      try {
        if (!canCall(this.aiClient, 'hasChatEndpoint')) {
          throw new Error('Chat endpoint is not configured');
        }

        aiText = await this.aiClient.createChatReport(
          [{ role: 'user', content: prompt }],
          { source: 'bot', reportes: [reportPayload] }
        );
      } catch (fallbackError) {
        errorAi('chat fallback unavailable', {
          reportId,
          username,
          status: fallbackError.response?.status || 'network',
          message: fallbackError.response?.data?.error || fallbackError.message
        });
        return normalized;
      }
    }

    const parsed = extractJsonBlock(aiText);
    if (!parsed) {
      warnAi('chat text could not be parsed as JSON', {
        reportId,
        username,
        preview: aiText ? aiText.slice(0, 180).replace(/\s+/g, ' ') : 'empty'
      });
      return normalized;
    }

    const merged = mergeReportDetails(normalized, parsed, correlationData);
    logAi('enrichment complete', {
      reportId,
      username,
      categories: merged.categories.length,
      tags: merged.tags.length,
      severity: merged.severity || 'none',
      hasSummary: Boolean(merged.analysis?.summary),
      hasReason: Boolean(merged.analysis?.reason),
      hasRecommendation: Boolean(merged.analysis?.recommendation || merged.analysis?.operationalRecommendation),
      corruptionPercent: merged.analysis?.corruptionPercent ?? 'none'
    });
    return merged;
  }
}

module.exports = {
  AiReportEnrichmentService,
  buildReportPrompt,
  mergeReportDetails,
  needsAiEnrichment
};
