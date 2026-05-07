const { isValidFileType } = require('../services/evidenceService');

const MAX_EVIDENCE_FILES = 5;

function normalizeEvidenceItem(item = {}) {
  return {
    url: item.url,
    name: item.name || 'evidence',
    contentType: item.contentType,
    size: Number(item.size || 0)
  };
}

function validateWebReportPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Body must be a JSON object.';
  }

  if (!payload.username || typeof payload.username !== 'string') {
    return 'Field "username" is required.';
  }

  if (!payload.reason || typeof payload.reason !== 'string') {
    return 'Field "reason" is required.';
  }

  if (typeof payload.anonymous !== 'boolean') {
    return 'Field "anonymous" must be boolean.';
  }

  if (!Array.isArray(payload.evidence) || payload.evidence.length === 0) {
    return 'Field "evidence" must contain at least one item.';
  }

  if (payload.evidence.length > MAX_EVIDENCE_FILES) {
    return `A maximum of ${MAX_EVIDENCE_FILES} evidence items is allowed.`;
  }

  const invalidEvidence = payload.evidence
    .map(normalizeEvidenceItem)
    .find((file) => !file.url || !file.contentType || !isValidFileType(file));

  if (invalidEvidence) {
    return 'Each evidence item must include valid "url" and supported "contentType".';
  }

  if (payload.report !== undefined) {
    if (!payload.report || typeof payload.report !== 'object' || Array.isArray(payload.report)) {
      return 'Field "report" must be an object when provided.';
    }

    if (payload.report.categories !== undefined && !Array.isArray(payload.report.categories)) {
      return 'Field "report.categories" must be an array of strings.';
    }

    if (payload.report.tags !== undefined && !Array.isArray(payload.report.tags)) {
      return 'Field "report.tags" must be an array of strings.';
    }

    if (payload.report.contacto !== undefined && typeof payload.report.contacto !== 'string') {
      return 'Field "report.contacto" must be a string.';
    }

    if (payload.report.severity !== undefined && typeof payload.report.severity !== 'string') {
      return 'Field "report.severity" must be a string.';
    }

    if (payload.report.analysis !== undefined) {
      if (!payload.report.analysis || typeof payload.report.analysis !== 'object' || Array.isArray(payload.report.analysis)) {
        return 'Field "report.analysis" must be an object.';
      }
    }
  }

  if (payload.categories !== undefined && !Array.isArray(payload.categories)) {
    return 'Field "categories" must be an array of strings.';
  }

  if (payload.tags !== undefined && !Array.isArray(payload.tags)) {
    return 'Field "tags" must be an array of strings.';
  }

  if (payload.contacto !== undefined && typeof payload.contacto !== 'string') {
    return 'Field "contacto" must be a string.';
  }

  if (payload.severity !== undefined && typeof payload.severity !== 'string') {
    return 'Field "severity" must be a string.';
  }

  if (payload.analysis !== undefined) {
    if (!payload.analysis || typeof payload.analysis !== 'object' || Array.isArray(payload.analysis)) {
      return 'Field "analysis" must be an object.';
    }
  }

  return null;
}

module.exports = {
  normalizeEvidenceItem,
  validateWebReportPayload
};
