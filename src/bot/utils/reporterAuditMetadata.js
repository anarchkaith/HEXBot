const { toIsoDate } = require('./auditLogUtils');

function buildDiscordReporterMetadata(interaction) {
  const user = interaction.user;
  const member = interaction.member;

  return {
    source: 'discord',
    account: {
      id: user.id,
      username: user.username,
      globalName: user.globalName || null,
      tag: user.tag,
      bot: Boolean(user.bot),
      system: Boolean(user.system),
      avatarUrl: typeof user.displayAvatarURL === 'function' ? user.displayAvatarURL() : null,
      createdAt: toIsoDate(user.createdAt)
    },
    guild: {
      id: interaction.guildId || null,
      name: interaction.guild?.name || null
    },
    member: {
      nickname: member?.nickname || null,
      joinedAt: toIsoDate(member?.joinedAt),
      roles: member?.roles?.cache ? Array.from(member.roles.cache.keys()) : []
    },
    channel: {
      id: interaction.channelId || null
    }
  };
}

function buildWebReporterMetadata(payload, requestMetadata) {
  return {
    source: payload.source || 'web',
    account: {
      id: payload.reporter?.id || payload.reporterId || null,
      name: payload.reporter?.name || payload.reporterName || null,
      tag: payload.reporter?.tag || null,
      email: payload.reporter?.email || null
    },
    request: requestMetadata
  };
}

module.exports = {
  buildDiscordReporterMetadata,
  buildWebReporterMetadata
};
