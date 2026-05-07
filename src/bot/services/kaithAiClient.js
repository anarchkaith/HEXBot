const axios = require('axios');
const { buildBasicAuthHeader } = require('../utils/kaithApiAuth');
const { errorAi, logAi, warnAi } = require('../utils/aiLogger');

function extractResponseText(data = {}) {
  return data.response || data.text || data.output || data?.message?.content || data.raw || '';
}

class KaithAiClient {
  constructor(config) {
    this.config = config;
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.chatTimeoutMs
    });
  }

  hasChatEndpoint() {
    return Boolean(this.config.chatEndpoint);
  }

  hasCorrelationEndpoint() {
    return Boolean(this.config.reportCorrelationEndpoint);
  }

  hasGenerateEndpoint() {
    return Boolean(this.config.generateEndpoint);
  }

  get baseHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    const authHeader = buildBasicAuthHeader(this.config.user, this.config.password);
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    return headers;
  }

  async post(path, body, timeout) {
    const startedAt = Date.now();
    logAi('request start', { path, timeoutMs: timeout });
    try {
      const { data } = await this.http.post(path, body, {
        headers: this.baseHeaders,
        timeout
      });
      logAi('request success', {
        path,
        durationMs: Date.now() - startedAt,
        hasResponse: Boolean(extractResponseText(data) || data)
      });
      return data;
    } catch (error) {
      const status = error.response?.status || 'network';
      const upstreamMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      errorAi('request failed', {
        path,
        status,
        durationMs: Date.now() - startedAt,
        message: upstreamMessage
      });
      throw error;
    }
  }

  async createChatReport(messages, reportesContext) {
    if (!this.hasChatEndpoint()) {
      throw new Error('Chat endpoint is not configured');
    }

    const data = await this.post(this.config.chatEndpoint, {
      messages,
      useReportesDb: true,
      reportesContext
    }, this.config.chatTimeoutMs);
    const text = extractResponseText(data);
    warnAi('chat response received', {
      length: text.length,
      preview: text ? text.slice(0, 120).replace(/\s+/g, ' ') : 'empty'
    });
    return text;
  }

  async correlateReport(usuario, report) {
    if (!this.hasCorrelationEndpoint()) {
      throw new Error('Correlation endpoint is not configured');
    }

    const body = usuario ? { usuario } : { report };
    return this.post(this.config.reportCorrelationEndpoint, body, this.config.correlationTimeoutMs);
  }

  async generate(prompt) {
    if (!this.hasGenerateEndpoint()) {
      throw new Error('Generate endpoint is not configured');
    }

    const data = await this.post(this.config.generateEndpoint, {
      model: this.config.model,
      prompt,
      stream: false
    }, this.config.chatTimeoutMs);

    return extractResponseText(data);
  }
}

module.exports = {
  KaithAiClient,
  extractResponseText
};
