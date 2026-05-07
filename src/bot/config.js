const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(process.cwd(), '.env');

function readEnvValue(env, key, defaultValue = '') {
  return Object.prototype.hasOwnProperty.call(env, key) ? env[key] : defaultValue;
}

function loadConfig() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error('.env file not found. Program stopped.');
  }

  const env = Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
      })
  );

  return {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    guildId: env.DISCORD_GUILD_ID,
    reportChannelId: env.DISCORD_REPORT_CHANNEL_ID,
    mostWantedChannelId: env.DISCORD_MOST_WANTED_CHANNEL_ID,
    logsChannelId: env.DISCORD_LOGS_CHANNEL_ID,
    staffRoleId: env.DISCORD_STAFF_ROLE_ID,
    wantedFolder: env.WANTED_FOLDER || 'wanted_reports',
    apiPort: env.API_PORT || '3001',
    apiSecret: env.API_SECRET || '',
    kaithApiBaseUrl: env.KAITH_API_BASE_URL || '',
    kaithAiChatEndpoint: readEnvValue(env, 'KAITH_AI_CHAT_ENDPOINT', '/api/ia-chat'),
    kaithAiIntentEndpoint: readEnvValue(env, 'KAITH_AI_INTENT_ENDPOINT', '/api/ia-intent'),
    kaithAiReportCorrelationEndpoint: readEnvValue(env, 'KAITH_AI_REPORT_CORRELATION_ENDPOINT', '/api/ia-report-correlation'),
    kaithAiGenerateEndpoint: readEnvValue(env, 'KAITH_AI_GENERATE_ENDPOINT', '/api/generate'),
    kaithAiUser: env.KAITH_AI_USER || '',
    kaithAiPassword: env.KAITH_AI_PASSWORD || '',
    kaithAiModel: env.KAITH_AI_MODEL || 'qwen2.5:latest',
    kaithAiChatTimeoutMs: Number(env.KAITH_AI_CHAT_TIMEOUT_MS || 120000),
    kaithAiCorrelationTimeoutMs: Number(env.KAITH_AI_CORRELATION_TIMEOUT_MS || 120000)
  };
}

module.exports = { loadConfig };
