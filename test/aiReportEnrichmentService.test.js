const assert = require('node:assert/strict');
const {
  AiReportEnrichmentService,
  buildReportPrompt,
  mergeReportDetails,
  needsAiEnrichment
} = require('../src/bot/services/aiReportEnrichmentService');
const { extractJsonBlock, normalizeAiReportPayload } = require('../src/bot/utils/aiReportParser');

assert.equal(needsAiEnrichment({}), true);
assert.equal(needsAiEnrichment({
  categories: ['Exploit'],
  tags: ['teleport'],
  severity: 'alta',
  analysis: {
    summary: 'Resumen',
    reason: 'Motivo analitico',
    recommendation: 'Recomendacion',
    corruptionPercent: 70
  }
}), false);

const merged = mergeReportDetails(
  {
    categories: ['Exploit'],
    tags: ['teleport'],
    severity: '',
    analysis: {
      summary: '',
      reason: '',
      recommendation: '',
      corruptionPercent: null
    }
  },
  {
    categories: ['Modder'],
    tags: ['godmode'],
    severity: 'critica',
    summary: 'Resumen IA',
    recommendation: 'Recomendacion IA',
    reason: 'Fundamento IA',
    corruptionPercent: 90
  },
  {
    correlations: ['Coincidencia con reportes recientes'],
    conclusion: 'Riesgo global elevado'
  }
);

assert.deepEqual(merged.categories, ['Exploit', 'Modder']);
assert.deepEqual(merged.tags, ['teleport', 'godmode']);
assert.equal(merged.severity, 'critica');
assert.equal(merged.analysis.summary, 'Resumen IA');
assert.equal(merged.analysis.recommendation, 'Recomendacion IA');
assert.match(merged.analysis.reason, /Coincidencia con reportes recientes/);
assert.equal(merged.analysis.corruptionPercent, 90);

const parsed = extractJsonBlock('Texto previo {"summary":"ok","tags":["uno"]} texto final');
assert.equal(parsed.summary, 'ok');
assert.deepEqual(parsed.tags, ['uno']);

const normalizedPayload = normalizeAiReportPayload({
  analysis: {
    resumen: 'Resumen nested',
    fundamentoIa: 'Fundamento nested',
    recomendacion: 'Recomendacion nested',
    nivelCorrupcion: '80%',
    severidad: 'crítica',
    etiquetas: ['nested-tag']
  },
  categorias: ['Nested category']
});

assert.equal(normalizedPayload.analysis.summary, 'Resumen nested');
assert.equal(normalizedPayload.analysis.reason, 'Fundamento nested');
assert.equal(normalizedPayload.analysis.recommendation, 'Recomendacion nested');
assert.equal(normalizedPayload.analysis.corruptionPercent, '80%');
assert.deepEqual(normalizedPayload.categories, ['Nested category']);

const prompt = buildReportPrompt({
  report: { usuario: 'Ghost', motivo: 'Teleport' }
});
assert.match(prompt, /SOLO con JSON valido/);
assert.match(prompt, /Ghost/);

module.exports = (async () => {
  const generateFirstCalls = [];
  const generateFirstService = new AiReportEnrichmentService({
    hasGenerateEndpoint: () => true,
    hasChatEndpoint: () => true,
    hasCorrelationEndpoint: () => false,
    async generate(promptText) {
      generateFirstCalls.push({ type: 'generate', promptText });
      return JSON.stringify({
        summary: 'Resumen por generate',
        recommendation: 'Recomendacion por generate',
        reason: 'Motivo por generate',
        corruptionPercent: 55,
        severity: 'alta',
        categories: ['Fraude'],
        tags: ['generate']
      });
    },
    async createChatReport() {
      generateFirstCalls.push({ type: 'chat' });
      return JSON.stringify({});
    }
  });

  const generateFirstResult = await generateFirstService.enrichReportDetails({
    reportId: 7,
    username: 'Ghost',
    reason: 'Teleport',
    reportDetails: {},
    reporterTag: 'Tester',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  assert.deepEqual(generateFirstCalls.map((entry) => entry.type), ['generate']);
  assert.equal(generateFirstResult.analysis.summary, 'Resumen por generate');
  assert.deepEqual(generateFirstResult.categories, ['Fraude']);

  const chatFallbackCalls = [];
  const chatFallbackService = new AiReportEnrichmentService({
    hasGenerateEndpoint: () => true,
    hasChatEndpoint: () => true,
    hasCorrelationEndpoint: () => false,
    async generate() {
      chatFallbackCalls.push({ type: 'generate' });
      throw new Error('generate failed');
    },
    async createChatReport() {
      chatFallbackCalls.push({ type: 'chat' });
      return JSON.stringify({
        summary: 'Resumen por chat',
        recommendation: 'Recomendacion por chat',
        reason: 'Motivo por chat',
        corruptionPercent: 60,
        severity: 'media',
        categories: ['Chat'],
        tags: ['fallback']
      });
    }
  });

  const chatFallbackResult = await chatFallbackService.enrichReportDetails({
    reportId: 8,
    username: 'Ghost',
    reason: 'Aimbot',
    reportDetails: {},
    reporterTag: 'Tester',
    timestamp: new Date('2026-01-01T00:00:00.000Z')
  });

  assert.deepEqual(chatFallbackCalls.map((entry) => entry.type), ['generate', 'chat']);
  assert.equal(chatFallbackResult.analysis.summary, 'Resumen por chat');
  assert.deepEqual(chatFallbackResult.tags, ['fallback']);

  console.log('aiReportEnrichmentService tests passed');
})();
