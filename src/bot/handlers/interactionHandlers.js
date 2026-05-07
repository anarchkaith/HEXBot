const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { collectEvidence, splitEvidenceByType, isValidFileType } = require('../services/evidenceService');
const { fetchUserAvatarUrl } = require('../services/socialClubService');
const { submitReport } = require('../services/reportSubmissionService');
const { buildMostWantedReportMessage } = require('../builders/hexMostWantedMessageBuilder');
const { buildDiscordReporterMetadata } = require('../utils/reporterAuditMetadata');

function bindInteractionHandlers({ client, config, stateService, embedService, aiReportEnrichmentService }) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'report') {
      await handleReportCommand({ interaction, config, stateService, embedService, client });
      return;
    }

    if (interaction.commandName === 'mwlist') {
      await handleWantedListCommand({ interaction, stateService, embedService });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId.startsWith('refuse_modal_')) {
      await handleRefuseModal({ interaction, config, stateService, embedService, client });
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    await handleActionButton({ interaction, config, stateService, embedService, aiReportEnrichmentService, client });
  });
}

async function handleReportCommand({ interaction, config, stateService, embedService, client }) {
  if (stateService.isOnCooldown(interaction.user.id)) {
    const remaining = stateService.getRemainingCooldownSeconds(interaction.user.id);
    const formatted = stateService.formatCooldown(remaining);
    await interaction.reply({
      content: `❌ **You cannot submit another report yet!**\n> Please wait **${formatted}** before submitting another report.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const username = interaction.options.getString('username');
    const reason = interaction.options.getString('reason');
    const anonymous = interaction.options.getBoolean('anonymous');
    const evidenceFiles = collectEvidence(interaction);

    if (evidenceFiles.length === 0) {
      await interaction.editReply({ content: '❌ At least one evidence file is required!' });
      return;
    }

    const invalidFiles = evidenceFiles.filter((file) => !isValidFileType(file));
    if (invalidFiles.length > 0) {
      await interaction.editReply({
        content: `❌ Invalid file type! Only images (PNG, JPG, GIF, WEBP) or videos (MP4, WEBM, MOV) are allowed.\nInvalid: ${invalidFiles.map((f) => f.name).join(', ')}`
      });
      return;
    }

    const oversized = evidenceFiles.filter((file) => file.size > 25 * 1024 * 1024);
    if (oversized.length > 0) {
      await interaction.editReply({
        content: `❌ File(s) too large! Maximum 25MB per file.\nOversized: ${oversized.map((f) => f.name).join(', ')}`
      });
      return;
    }

    const submission = await submitReport({
      client,
      config,
      stateService,
      embedService,
      username,
      reason,
      anonymous,
      evidenceFiles,
      reporter: {
        id: interaction.user.id,
        tag: interaction.user.tag,
        mention: interaction.user.toString(),
        source: 'discord'
      },
      reporterMetadata: buildDiscordReporterMetadata(interaction)
    });

    stateService.setCooldown(interaction.user.id);

    await interaction.editReply({
      content: `✅ **Report #${submission.reportId} submitted successfully!**\n> Your report has been sent to staff for review with **${submission.evidenceCount}** evidence file(s).\n> **Anonymous Mode:** ${anonymous ? 'Enabled' : 'Disabled'}\n> **Next report available in 1 minute.**`
    });
  } catch (error) {
    console.error('Error in report command:', error);
    await interaction.editReply({ content: '❌ An error occurred while processing your report. Please try again later.' });
  }
}

async function handleWantedListCommand({ interaction, stateService, embedService }) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const embed = embedService.createWantedListEmbed(stateService.wantedList, 0);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in mwlist command:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching the Most Wanted list.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleRefuseModal({ interaction, config, stateService, embedService, client }) {
  const reportId = interaction.customId.split('_')[2];
  const report = stateService.getActiveReport(reportId);

  if (!report) {
    await interaction.reply({
      content: '❌ This report no longer exists or has already been processed.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const refusalReason = interaction.fields.getTextInputValue('refusal_reason');
  await interaction.deferUpdate();

  try {
    stateService.markProcessed(reportId);

    const staffMention = interaction.user.toString();
    const reportChannel = client.channels.cache.get(report.channelId);
    if (reportChannel && report.messageId) {
      try {
        const originalMessage = await reportChannel.messages.fetch(report.messageId);
        const updatedEmbed = embedService.build('report_refused_inline', {
          reportId,
          staffMention,
          refusalReason
        }, false);
        await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
      } catch (error) {
        console.error('Error updating original message:', error);
      }
    }

    const { imageUrls, videoUrls } = splitEvidenceByType(report.evidenceFiles);
    const reporterDisplay = report.anonymous
      ? `> 👤 **Anonymous Reporter** (ID: ${report.reporterId})`
      : `> ${report.reporterMention}`;

    const refusalEmbed = embedService.build('log_refused', {
      reportId,
      username: report.username,
      reason: report.reason,
      staffMention,
      reporterDisplay,
      refusalReason,
      firstImageUrl: imageUrls[0] || null
    }, true);

    const additionalImageEmbeds = embedService.createAdditionalImageEmbeds(imageUrls, true);
    const videoEmbeds = embedService.createVideoEmbeds(videoUrls);

    const logsChannel = client.channels.cache.get(config.logsChannelId);
    if (logsChannel) {
      await logsChannel.send({ embeds: [refusalEmbed, ...additionalImageEmbeds] });
      for (const videoEmbed of videoEmbeds) {
        await logsChannel.send({ embeds: [videoEmbed] });
      }
    }

    try {
      const reporter = await client.users.fetch(report.reporterId);
      const dmEmbed = embedService.build('dm_refused', {
        reportId,
        username: report.username,
        reason: report.reason,
        refusalReason
      }, false);
      await reporter.send({ embeds: [dmEmbed] }).catch(() => { });
    } catch (error) {
      console.log('Could not DM user');
    }

    stateService.deleteActiveReport(reportId);
  } catch (error) {
    console.error('Error processing refusal:', error);
  }
}

async function processAcceptedReport({ reportId, report, staffMention, config, stateService, embedService, aiReportEnrichmentService, client }) {
  try {
    await stateService.saveEvidenceToFolder({
      username: report.username,
      reportId,
      evidenceFiles: report.evidenceFiles,
      reason: report.reason,
      reporterId: report.reporterId,
      reporterTag: report.reporterTag,
      timestamp: report.timestamp
    });

    stateService.addWantedReport(
      report.username,
      reportId,
      report.reason,
      report.reporterTag,
      report.timestamp
    );

    const enrichedReportDetails = aiReportEnrichmentService
      ? await aiReportEnrichmentService.enrichReportDetails({
        reportId,
        username: report.username,
        reason: report.reason,
        reportDetails: report.reportDetails,
        reporterTag: report.reporterTag,
        timestamp: report.timestamp
      })
      : (report.reportDetails || {});

    const { imageUrls, videoUrls } = splitEvidenceByType(report.evidenceFiles);
    const { avatarUrl, rid } = await fetchUserAvatarUrl(report.username);
    const mostWantedMessage = buildMostWantedReportMessage({
      username: report.username,
      reason: report.reason,
      report: {
        ...enrichedReportDetails,
        anonymous: report.anonymous
      },
      reporter: {
        tag: report.reporterTag,
        name: report.reporterMention
      },
      imageUrls,
      avatarUrl,
      rid,
      timestamp: report.timestamp
    });

    const videoEmbedsMW = embedService.createVideoEmbeds(videoUrls);

    const mostWantedChannel = client.channels.cache.get(config.mostWantedChannelId);
    if (mostWantedChannel) {
      await mostWantedChannel.send(mostWantedMessage);
      for (const videoEmbed of videoEmbedsMW) {
        await mostWantedChannel.send({ embeds: [videoEmbed] });
      }
    }

    const reporterDisplayLogs = report.anonymous
      ? `> 👤 **Anonymous Reporter** (${report.reporterTag})`
      : `> ${report.reporterMention}`;

    const logEmbed = embedService.build('log_accepted', {
      reportId,
      username: report.username,
      reason: report.reason,
      staffMention,
      reporterDisplay: reporterDisplayLogs,
      firstImageUrl: imageUrls[0] || null
    }, true);

    const additionalImageEmbedsLog = embedService.createAdditionalImageEmbeds(imageUrls, false);

    const logsChannel = client.channels.cache.get(config.logsChannelId);
    if (logsChannel) {
      await logsChannel.send({ embeds: [logEmbed, ...additionalImageEmbedsLog] });
      for (const videoEmbed of videoEmbedsMW) {
        await logsChannel.send({ embeds: [videoEmbed] });
      }
    }

    stateService.deleteActiveReport(reportId);
  } catch (error) {
    console.error('Error processing accepted report:', error);
  }
}

async function handleActionButton({ interaction, config, stateService, embedService, aiReportEnrichmentService, client }) {
  try {
    const [action, reportId] = interaction.customId.split('_');

    const member = interaction.member;
    const hasStaffRole = member.roles.cache.has(config.staffRoleId);
    if (!hasStaffRole) {
      await interaction.reply({ content: '❌ You do not have permission.', flags: MessageFlags.Ephemeral });
      return;
    }

    const report = stateService.getActiveReport(reportId);
    if (!report) {
      await interaction.reply({ content: '❌ Report not found.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (action === 'refuse') {
      const modal = new ModalBuilder().setCustomId(`refuse_modal_${reportId}`).setTitle(`Refuse Report #${reportId}`);
      const reasonInput = new TextInputBuilder()
        .setCustomId('refusal_reason')
        .setLabel('Why are you refusing this report?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
      return;
    }

    if (action !== 'accept') return;

    await interaction.deferUpdate();

    stateService.markProcessed(reportId);
    const staffMention = interaction.user.toString();

    const reportChannel = client.channels.cache.get(report.channelId);
    if (reportChannel && report.messageId) {
      try {
        const originalMessage = await reportChannel.messages.fetch(report.messageId);
        const updatedEmbed = embedService.build('report_accepted', {
          username: report.username,
          staffMention
        }, false);
        await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
      } catch (error) {
        console.error('Error updating original message:', error);
      }
    }

    processAcceptedReport({
      reportId,
      report,
      staffMention,
      config,
      stateService,
      embedService,
      aiReportEnrichmentService,
      client
    });
  } catch (error) {
    console.error('Error handling button interaction:', error);
  }
}

module.exports = {
  bindInteractionHandlers
};
