function formatMeta(meta = {}) {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return '';
  return ` ${entries.map(([key, value]) => `${key}=${value}`).join(' ')}`;
}

function logAi(message, meta) {
  console.log(`[AI] ${message}${formatMeta(meta)}`);
}

function warnAi(message, meta) {
  console.warn(`[AI] ${message}${formatMeta(meta)}`);
}

function errorAi(message, meta) {
  console.error(`[AI] ${message}${formatMeta(meta)}`);
}

module.exports = {
  logAi,
  warnAi,
  errorAi
};
