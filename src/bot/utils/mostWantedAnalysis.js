const SEVERITY_COLORS = {
  baja: 0x2ecc40,
  media: 0xffe066,
  alta: 0xffa500,
  critica: 0xff3333,
  inviable: 0x000000
};

const SEVERITY_CORRUPTION = {
  baja: 25,
  media: 50,
  alta: 75,
  critica: 90,
  inviable: 100
};

const THREAT_LEVEL_CORRUPTION = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 90,
  inviable: 100
};

function normalizeSeverity(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return SEVERITY_COLORS[normalized] ? normalized : null;
}

function normalizeThreatLevel(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return THREAT_LEVEL_CORRUPTION[normalized] ? normalized : null;
}

function clampPercent(value) {
  if (typeof value === 'string') {
    const matches = value.match(/-?\d+(?:[\.,]\d+)?/g);
    if (!matches || matches.length === 0) return null;

    // Strings with ranges (e.g. "0-100") are ambiguous and were causing false 0%.
    if (matches.length > 1) return null;

    value = matches[0].replace(',', '.');
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function deriveCorruption(report = {}) {
  const analysis = report.analysis || {};
  const explicitPercent = clampPercent(analysis.corruptionPercent);
  if (explicitPercent !== null) {
    return {
      percent: explicitPercent,
      source: 'explicit',
      reason: analysis.corruptionReason || 'Porcentaje provisto por el analisis recibido.'
    };
  }

  const severity = normalizeSeverity(report.severity);
  if (severity) {
    return {
      percent: SEVERITY_CORRUPTION[severity],
      source: 'severity',
      reason: analysis.corruptionReason || `Nivel derivado desde la severidad "${severity}".`
    };
  }

  const threatLevel = normalizeThreatLevel(analysis.threatLevel);
  if (threatLevel) {
    return {
      percent: THREAT_LEVEL_CORRUPTION[threatLevel],
      source: 'threatLevel',
      reason: analysis.corruptionReason || `Nivel derivado desde threatLevel "${threatLevel}".`
    };
  }

  return {
    percent: 50,
    source: 'fallback',
    reason: analysis.corruptionReason || 'Sin suficientes datos; se aplica un valor medio por defecto.'
  };
}

function getSeverityColor(report = {}) {
  const severity = normalizeSeverity(report.severity);
  return severity ? SEVERITY_COLORS[severity] : SEVERITY_COLORS.media;
}

function buildCorruptionBar(percent) {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return `${'■'.repeat(filled)}${'□'.repeat(10 - filled)} **${percent}%**`;
}

function stringifyList(values, fallback = 'Sin datos.') {
  if (!Array.isArray(values)) return fallback;
  const normalized = values.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
  return normalized.length > 0 ? normalized.join(', ') : fallback;
}

module.exports = {
  deriveCorruption,
  getSeverityColor,
  buildCorruptionBar,
  stringifyList
};
