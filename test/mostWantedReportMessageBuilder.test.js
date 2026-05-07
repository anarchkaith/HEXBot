const assert = require('node:assert/strict');
const { buildMostWantedReportMessage } = require('../src/bot/builders/hexMostWantedMessageBuilder');
const { extractReportDetailsFromPayload } = require('../src/bot/utils/reportDetails');

function testMinimalPayload() {
  const message = buildMostWantedReportMessage({
    username: 'Jugador123',
    reason: 'Uso de exploit en carrera.',
    report: {},
    reporter: {}
  });

  assert.equal(message.content, '`⌬` **[SE BUSCA]** :: *Nueva amenaza detectada...*');
  assert.equal(message.embeds.length, 1);

  const embed = message.embeds[0].toJSON();
  assert.equal(embed.author.name, '◢◤ H.E.X. ◢◤');
  assert.equal(embed.title, 'TARGET MARCADO');
  assert.match(embed.footer.text, /LOG_BY: ANONIMO \/\/ NO MERCY FOR TOXICS/);
  assert.equal(embed.fields.some((field) => field.name === '🆔 RID'), false);
  assert.equal(embed.fields.some((field) => field.name === '⚖️ FUNDAMENTO DEL NIVEL DE CORRUPCIÓN'), false);
  assert.equal(embed.fields.some((field) => field.name === '🧭 DIRECTIVA BREVE'), true);
  assert.equal(embed.fields.some((field) => field.name === '🏷️ CÓDIGOS DE AMENAZA'), false);

  const directiveField = embed.fields.find((field) => field.name === '🧭 DIRECTIVA BREVE');
  assert.match(directiveField.value, /Staff:/);
  assert.match(directiveField.value, /Miembros:/);
}

function testEnrichedPayload() {
  const message = buildMostWantedReportMessage({
    username: 'Ghost',
    reason: 'Ataque coordinado con vehiculos exploit.',
    report: {
      contacto: 'KAITH_PANEL',
      categories: ['Exploit', 'Vehiculos'],
      tags: ['exploit', '#toxic'],
      severity: 'critica',
      analysis: {
        summary: 'Sujeto reincidente con patron de abuso.',
        recommendation: 'Suspension preventiva inmediata.',
        tacticalDirective: 'Staff: Suspender y documentar. Miembros: No interactuar y reportar evidencia.',
        reason: 'Coincidencia de patron con incidentes previos.',
        corruptionPercent: 80,
        corruptionReason: 'Severidad alta y multiples evidencias.',
        threatLevel: 'critical',
        confidence: 0.92
      }
    },
    reporter: {
      tag: 'Kaith#0001'
    },
    imageUrls: ['https://example.com/image-1.png', 'https://example.com/image-2.png']
  });

  assert.equal(message.embeds.length, 2);

  const embed = message.embeds[0].toJSON();
  assert.equal(embed.color, 0xff3333);
  assert.match(embed.footer.text, /LOG_BY: KAITH_PANEL \/\/ NO MERCY FOR TOXICS/);
  assert.equal(embed.fields.some((field) => field.name === '👤 SUJETO'), true);
  assert.equal(embed.fields.some((field) => field.name === '⚖️ FUNDAMENTO DEL NIVEL DE CORRUPCIÓN'), false);

  const corruptionField = embed.fields.find((field) => field.name === '☣️ NIVEL DE CORRUPCIÓN');
  const tagsField = embed.fields.find((field) => field.name === '🏷️ CÓDIGOS DE AMENAZA');
  const recommendationField = embed.fields.find((field) => field.name === '🎯 RECOMENDACIÓN OPERATIVA');
  const directiveField = embed.fields.find((field) => field.name === '🧭 DIRECTIVA BREVE');
  assert.match(corruptionField.value, /80%/);
  assert.equal(tagsField.value, '#exploit, #toxic');
  assert.match(recommendationField.value, /Suspension preventiva inmediata/);
  assert.match(directiveField.value, /Staff: Suspender y documentar/);
}

testMinimalPayload();
testEnrichedPayload();

const legacyPayloadReport = extractReportDetailsFromPayload({
  tags: ['legacy-tag'],
  categories: ['Legacy category'],
  severity: 'alta',
  analysis: {
    summary: 'Legacy summary'
  }
});

assert.deepEqual(legacyPayloadReport.tags, ['legacy-tag']);
assert.deepEqual(legacyPayloadReport.categories, ['Legacy category']);
assert.equal(legacyPayloadReport.severity, 'alta');
assert.equal(legacyPayloadReport.analysis.summary, 'Legacy summary');

console.log('mostWantedReportMessageBuilder tests passed');
