const { EmbedBuilder } = require('discord.js');
const { DISCORD_LIMITS, formatCodeBlock, formatTags, truncateText } = require('../utils/discordText');
const { buildCorruptionBar, deriveCorruption, getSeverityColor, stringifyList } = require('../utils/mostWantedAnalysis');

const HEADER_CONTENT = '`⌬` **[SE BUSCA]** :: *Nueva amenaza detectada...*';
const AUTHOR_NAME = '◢◤ H.E.X. ◢◤';
const AUTHOR_ICON_URL = 'https://i.ibb.co/zT7r8F2P/X.png';
const FOOTER_ICON_URL = 'https://i.ibb.co/v4KTFw0q/Vector.png';

function getFallback(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function resolveFooterContact(report, reporter, anonymous) {
  if (typeof report.contacto === 'string' && report.contacto.trim()) return report.contacto.trim();
  if (typeof reporter.tag === 'string' && reporter.tag.trim()) return reporter.tag.trim();
  if (typeof reporter.name === 'string' && reporter.name.trim()) return reporter.name.trim();
  return anonymous ? 'ANONIMO' : 'ANONIMO';
}

function buildRecommendationValue(report) {
  const analysis = report.analysis || {};
  const recommendation = getFallback(
    analysis.operationalRecommendation || analysis.recommendation,
    'Sin recomendacion operativa disponible.'
  );
  const risk = getFallback(analysis.threatLevel, 'Sin nivel de riesgo.');
  const confidence = typeof analysis.confidence === 'number' || typeof analysis.confidence === 'string'
    ? `${analysis.confidence}`
    : 'Sin confianza calculada.';

  return truncateText(
    `${recommendation}\nRiesgo: ${risk}\nConfianza: ${confidence}`,
    DISCORD_LIMITS.fieldValue,
    'Sin recomendacion operativa disponible.'
  );
}

function buildAdditionalImageEmbeds(imageUrls = []) {
  return imageUrls.slice(1).map((url, index) => (
    new EmbedBuilder()
      .setColor(0x000000)
      .setImage(url)
      .setFooter({ text: `Evidencia ${index + 2}`, iconURL: FOOTER_ICON_URL })
      .setTimestamp()
  ));
}

function buildMostWantedReportMessage({
  username,
  reason,
  report = {},
  reporter = {},
  imageUrls = [],
  avatarUrl = null,
  timestamp = new Date()
}) {
  const corruption = deriveCorruption(report);
  const footerContact = resolveFooterContact(report, reporter, report.anonymous);
  const categories = stringifyList(report.categories, 'Sin datos.');
  const summary = getFallback(report.analysis?.summary, 'Sin analisis disponible.');
  const operationalRecommendation = getFallback(
    report.analysis?.operationalRecommendation || report.analysis?.recommendation,
    buildRecommendationValue(report)
  );
  const analysisReason = getFallback(report.analysis?.reason, 'Sin fundamento IA.');
  const threatTags = formatTags(report.tags);

  const embed = new EmbedBuilder()
    .setColor(getSeverityColor(report))
    .setAuthor({ name: AUTHOR_NAME, iconURL: AUTHOR_ICON_URL })
    .setTitle(truncateText('✖️ [ TARGET MARKED FOR TERMINATION ] ✖️', DISCORD_LIMITS.title))
    .setTimestamp(timestamp)
    .setFooter({ text: truncateText(`LOG_BY: ${footerContact} // NO MERCY FOR TOXICS`, 2048), iconURL: FOOTER_ICON_URL });

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  if (imageUrls[0]) {
    embed.setImage(imageUrls[0]);
  }

  const fields = [
    {
      name: '⟦ 👤 SUJETO IDENTIFICADO ⟧',
      value: formatCodeBlock('diff', truncateText(String(username || 'Sin datos.'), 900), DISCORD_LIMITS.fieldValue)
    },
    {
      name: '📡 CARGO IMPUTADO',
      value: truncateText(categories, DISCORD_LIMITS.fieldValue)
    },
    {
      name: '☣️ NIVEL DE CORRUPCIÓN',
      value: truncateText(buildCorruptionBar(corruption.percent), DISCORD_LIMITS.fieldValue)
    },
    {
      name: '🗒️ INFORME DE OPERACIONES',
      value: formatCodeBlock('fix', reason, DISCORD_LIMITS.fieldValue)
    },
    {
      name: '🧠 RESUMEN POLICIAL',
      value: truncateText(summary, DISCORD_LIMITS.fieldValue, 'Sin analisis disponible.')
    },
    {
      name: '🎯 RECOMENDACIÓN OPERATIVA',
      value: truncateText(operationalRecommendation, DISCORD_LIMITS.fieldValue, 'Sin recomendacion operativa disponible.')
    },
    {
      name: '📎 FUNDAMENTO IA',
      value: truncateText(analysisReason, DISCORD_LIMITS.fieldValue, 'Sin fundamento IA.')
    },
    {
      name: '⚖️ FUNDAMENTO DEL NIVEL DE CORRUPCIÓN',
      value: truncateText(corruptionReason, DISCORD_LIMITS.fieldValue)
    },
    {
      name: '🧭 DIRECTIVA DE INTERVENCIÓN TÁCTICA',
      value: truncateText(tacticalDirective, DISCORD_LIMITS.fieldValue, 'Sin directiva tactica generada.')
    }
  ];

  if (rid) {
    fields.splice(1, 0, {
      name: '🆔 RID',
      value: truncateText(String(rid), DISCORD_LIMITS.fieldValue)
    });
  }

  if (threatTags) {
    fields.push({
      name: '🏷️ CÓDIGOS DE AMENAZA',
      value: truncateText(threatTags, DISCORD_LIMITS.fieldValue)
    });
  }

  embed.addFields(fields.map((field) => ({
    name: truncateText(field.name, DISCORD_LIMITS.fieldName),
    value: field.value
  })));

  return {
    content: HEADER_CONTENT,
    embeds: [embed, ...buildAdditionalImageEmbeds(imageUrls)]
  };
}

module.exports = {
  buildMostWantedReportMessage
};
