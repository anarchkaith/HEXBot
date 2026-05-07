const { splitEvidenceByType } = require('./evidenceService');
const { fetchUserAvatarUrl } = require('./socialClubService');
const { toIsoDate } = require('../utils/auditLogUtils');
const { normalizeReportDetails } = require('../utils/reportDetails');

function buildReporterIdentity(reporter = {}) {
  return reporter.mention || reporter.label || reporter.tag || reporter.name || `Reporter ID: ${reporter.id || 'external'}`;
}

function mapEvidenceFiles(evidenceFiles) {
  return evidenceFiles.map((file) => ({
    url: file.url,
    name: file.name,
    contentType: file.contentType
  }));
}

async function submitReport({
  client,
  config,
  stateService,
  embedService,
  username,
  reason,
  anonymous,
  evidenceFiles,
  reporter,
  reporterMetadata,
  reportDetails
}) {
  const reportId = stateService.getNextReportId();
  const { imageUrls, videoUrls, evidenceText } = splitEvidenceByType(evidenceFiles);
  const { avatarUrl, rid } = await fetchUserAvatarUrl(username);
  const normalizedReportDetails = normalizeReportDetails(reportDetails);

  const reportEmbed = embedService.build('report_pending', {
    reportId,
    username,
    reason,
    reporterDisplay: `> ${buildReporterIdentity(reporter)} ${anonymous ? '(Anonymous Mode)' : ''}`,
    evidenceText,
    fileCount: evidenceFiles.length,
    firstImageUrl: imageUrls[0] || null,
    avatarUrl,
    rid
  }, true);

  const reportChannel = client.channels.cache.get(config.reportChannelId);
  if (!reportChannel) {
    throw new Error('Report channel not found. Please verify DISCORD_REPORT_CHANNEL_ID.');
  }

  stateService.addActiveReport(reportId, {
    username,
    reason,
    evidenceFiles: mapEvidenceFiles(evidenceFiles),
    reporterId: reporter.id,
    reporterTag: reporter.tag || reporter.name || reporter.label || 'External Reporter',
    reporterMention: buildReporterIdentity(reporter),
    anonymous,
    timestamp: new Date(),
    messageId: null,
    channelId: config.reportChannelId,
    reportId,
    source: reporter.source || 'external',
    reportDetails: normalizedReportDetails
  });

  const message = await reportChannel.send({
    embeds: [reportEmbed, ...embedService.createAdditionalImageEmbeds(imageUrls, true)],
    components: [embedService.createReportActionRow(reportId)]
  });

  for (const videoEmbed of embedService.createVideoEmbeds(videoUrls, 'Click the title to watch the video')) {
    await reportChannel.send({ embeds: [videoEmbed] });
  }

  const activeReport = stateService.getActiveReport(reportId);
  if (activeReport) activeReport.messageId = message.id;

  stateService.logReporterAudit({
    type: 'report_submission',
    reportId,
    createdAt: toIsoDate(new Date()),
    reportedUser: username,
    anonymous,
    source: reporter.source || 'external',
    evidenceCount: evidenceFiles.length,
    reporter: {
      id: reporter.id || null,
      identity: buildReporterIdentity(reporter)
    },
    metadata: reporterMetadata || null,
    reportDetails: normalizedReportDetails
  });

  return {
    reportId,
    evidenceCount: evidenceFiles.length
  };
}

module.exports = {
  submitReport
};
