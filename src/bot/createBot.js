const { once } = require('events');
const { Client } = require('discord.js');
const { loadConfig } = require('./config');
const { BOT_INTENTS, FILES, REPORT_COOLDOWN_MS } = require('./constants');
const { StateRepository } = require('./repositories/stateRepository');
const { StateService } = require('./services/stateService');
const { EmbedService } = require('./embeds/embedService');
const { KaithAiClient } = require('./services/kaithAiClient');
const { AiReportEnrichmentService } = require('./services/aiReportEnrichmentService');
const { logAi, warnAi } = require('./utils/aiLogger');
const { getCommands, registerSlashCommands } = require('./commands');
const { bindInteractionHandlers } = require('./handlers/interactionHandlers');
const { createApiServer } = require('./apiServer');

function createWantedBot(options = {}) {
  const config = options.config || loadConfig();

  const resolvedConfig = {
    ...config,
    wantedFolder: config.wantedFolder || 'wanted_reports'
  };

  const client = new Client({ intents: BOT_INTENTS });

  const repository = new StateRepository(FILES);
  const stateService = new StateService({
    repository,
    cooldownMs: REPORT_COOLDOWN_MS,
    wantedFolder: resolvedConfig.wantedFolder
  });

  const embedService = new EmbedService(client);
  const aiClient = resolvedConfig.kaithApiBaseUrl
    ? new KaithAiClient({
      baseUrl: resolvedConfig.kaithApiBaseUrl,
      chatEndpoint: resolvedConfig.kaithAiChatEndpoint,
      reportCorrelationEndpoint: resolvedConfig.kaithAiReportCorrelationEndpoint,
      generateEndpoint: resolvedConfig.kaithAiGenerateEndpoint,
      user: resolvedConfig.kaithAiUser,
      password: resolvedConfig.kaithAiPassword,
      model: resolvedConfig.kaithAiModel,
      chatTimeoutMs: resolvedConfig.kaithAiChatTimeoutMs,
      correlationTimeoutMs: resolvedConfig.kaithAiCorrelationTimeoutMs
    })
    : null;
  const aiReportEnrichmentService = new AiReportEnrichmentService(aiClient);
  const commands = getCommands();
  const apiServer = createApiServer({
    client,
    config: resolvedConfig,
    stateService,
    embedService,
    aiReportEnrichmentService
  });

  bindInteractionHandlers({
    client,
    config: resolvedConfig,
    stateService,
    embedService,
    aiReportEnrichmentService
  });

  client.once('clientReady', async () => {
    stateService.initialize();

    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log(`📝 Bot is ready in ${client.guilds.cache.size} servers`);
    console.log(`📊 Starting report ID: ${stateService.reportCounter + 1}`);
    console.log(`📁 Wanted reports folder: ${resolvedConfig.wantedFolder}`);
    console.log('⏰ Report cooldown: 1 minute');

    if (aiClient) {
      logAi('client configured', {
        baseUrl: resolvedConfig.kaithApiBaseUrl,
        chatEndpoint: resolvedConfig.kaithAiChatEndpoint,
        correlationEndpoint: resolvedConfig.kaithAiReportCorrelationEndpoint,
        generateEndpoint: resolvedConfig.kaithAiGenerateEndpoint
      });
    } else {
      warnAi('disabled: KAITH_API_BASE_URL is not configured');
    }

    client.user.setPresence({
      status: 'dnd',
      activities: [{ name: 'Coded by Ghost & Kaith', type: 0 }]
    });

    try {
      await registerSlashCommands({
        token: resolvedConfig.token,
        clientId: resolvedConfig.clientId,
        guildId: resolvedConfig.guildId,
        commands
      });
      console.log('✅ Successfully registered slash commands');

      const reportChannel = client.channels.cache.get(resolvedConfig.reportChannelId);
      const mostWantedChannel = client.channels.cache.get(resolvedConfig.mostWantedChannelId);
      const logsChannel = client.channels.cache.get(resolvedConfig.logsChannelId);

      if (!reportChannel) console.warn('⚠️ Warning: Report channel not found!');
      if (!mostWantedChannel) console.warn('⚠️ Warning: Most wanted channel not found!');
      if (!logsChannel) console.warn('⚠️ Warning: Logs channel not found!');
    } catch (error) {
      console.error('❌ Error during ready setup:', error);
    }
  });

  client.on('error', (error) => console.error('Discord client error:', error));
  process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));

  return {
    client,
    config: resolvedConfig,
    stateService,
    async start() {
      await client.login(resolvedConfig.token);
      if (!client.isReady()) {
        await once(client, 'clientReady');
      }
      await apiServer.start();
    },
    async stop() {
      await apiServer.stop();
      await client.destroy();
    }
  };
}

module.exports = {
  createWantedBot
};
