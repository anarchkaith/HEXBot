const http = require('http');
const { submitReport } = require('./services/reportSubmissionService');
const { toIsoDate } = require('./utils/auditLogUtils');
const { buildWebRequestMetadata } = require('./utils/requestMetadata');
const { buildWebReporterMetadata } = require('./utils/reporterAuditMetadata');
const { extractReportDetailsFromPayload } = require('./utils/reportDetails');
const { normalizeEvidenceItem, validateWebReportPayload } = require('./utils/webReportPayload');

const MAX_BODY_SIZE_BYTES = 1024 * 1024;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const apiKeyHeader = req.headers['x-api-key'];
  return typeof apiKeyHeader === 'string' ? apiKeyHeader.trim() : '';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_SIZE_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function buildReporter(payload) {
  return {
    id: payload.reporter?.id || payload.reporterId || 'web',
    name: payload.reporter?.name || payload.reporterName || 'Website',
    tag: payload.reporter?.tag || payload.reporterName || 'Website',
    label: payload.reporter?.label || payload.reporterName || payload.source || 'Website',
    mention: null,
    source: payload.source || 'web'
  };
}

function logSecurityEvent(stateService, req, event, details = {}) {
  stateService.logSecurityAudit({
    type: 'api_security_event',
    event,
    createdAt: toIsoDate(new Date()),
    request: buildWebRequestMetadata(req),
    details
  });
}

function createApiServer({ client, config, stateService, embedService }) {
  const port = Number(config.apiPort || 3001);

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/api/reports') {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    if (!config.apiSecret || getAuthToken(req) !== config.apiSecret) {
      logSecurityEvent(stateService, req, 'unauthorized_request');
      sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      return;
    }

    try {
      const payload = await readJsonBody(req);
      const validationError = validateWebReportPayload(payload);

      if (validationError) {
        logSecurityEvent(stateService, req, 'invalid_payload', { error: validationError });
        sendJson(res, 400, { ok: false, error: validationError });
        return;
      }

      const requestMetadata = buildWebRequestMetadata(req);
      const submission = await submitReport({
        client,
        config,
        stateService,
        embedService,
        username: payload.username.trim(),
        reason: payload.reason.trim(),
        anonymous: payload.anonymous,
        evidenceFiles: payload.evidence.map(normalizeEvidenceItem),
        reporter: buildReporter(payload),
        reporterMetadata: buildWebReporterMetadata(payload, requestMetadata),
        reportDetails: extractReportDetailsFromPayload(payload)
      });

      sendJson(res, 201, {
        ok: true,
        reportId: submission.reportId,
        evidenceCount: submission.evidenceCount
      });
    } catch (error) {
      console.error('API report submission failed:', error);
      const message = ['Invalid JSON body', 'Payload too large'].includes(error.message)
        ? error.message
        : 'Internal server error';
      logSecurityEvent(stateService, req, 'request_processing_error', { error: message });
      sendJson(res, message === 'Internal server error' ? 500 : 400, { ok: false, error: message });
    }
  });

  return {
    async start() {
      if (!config.apiSecret) {
        console.log('INFO External API disabled: API_SECRET is not configured.');
        return;
      }

      await new Promise((resolve) => {
        server.listen(port, () => {
          console.log(`External API listening on port ${port}`);
          resolve();
        });
      });
    },
    async stop() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

module.exports = {
  createApiServer
};
