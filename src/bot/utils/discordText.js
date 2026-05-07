const DISCORD_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024
};

function truncateText(value, maxLength, fallback = 'Sin datos.') {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatCodeBlock(language, value, maxLength = DISCORD_LIMITS.fieldValue, fallback = 'Sin datos.') {
  const safeValue = truncateText(value, maxLength - language.length - 8, fallback);
  return `\`\`\`${language}\n${safeValue}\n\`\`\``;
}

function formatTags(tags = []) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const normalized = tags
    .filter((tag) => typeof tag === 'string' && tag.trim())
    .map((tag) => `#${tag.trim().replace(/^#/, '')}`);

  return normalized.length > 0 ? normalized.join(', ') : null;
}

module.exports = {
  DISCORD_LIMITS,
  truncateText,
  formatCodeBlock,
  formatTags
};
