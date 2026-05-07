const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { EMOJIS } = require('../constants');

const EMBED_TEMPLATES = {
  report_pending: {
    color: '#000000',
    author: (d) => `REPORT #${d.reportId} | PENDING REVIEW`,
    title: null,
    description: (d) => [
      `${EMOJIS.USER} **REPORTED USER**`,
      `\`\`\`ansi\n\u001b[1;33m${d.username}\u001b[0m\n\`\`\``,
      d.rid ? `> 🆔 **RID:** \`${d.rid}\`` : '',
      '',
      `${EMOJIS.REASON} **VIOLATION REASON**`,
      `\`\`\`ansi\n\u001b[1;36m${d.reason}\u001b[0m\n\`\`\``,
      '',
      `${EMOJIS.REPORTER} **REPORTED BY**`,
      `${d.reporterDisplay}`,
      '',
      `${EMOJIS.EVIDENCE} **EVIDENCE FILES**`,
      `${d.evidenceText}`,
      ''
    ].join('\n'),
    footer: (d) => `Report ID: #${d.reportId} • ${d.fileCount} file(s) attached`,
    thumbnail: (d) => d.avatarUrl || null,
    image: (d) => d.firstImageUrl || null
  },
  report_accepted: {
    color: '#000000',
    author: (d) => `${d.username}`,
    title: null,
    description: (d) => [
      `${EMOJIS.ACCEPTED} **STATUS: ACCEPTED**`,
      `> Certified by ${d.staffMention}`,
      ''
    ].join('\n'),
    footer: null,
    thumbnail: null,
    image: null
  },
  report_refused_inline: {
    color: '#000000',
    author: (d) => `REPORT #${d.reportId} | REFUSED`,
    title: null,
    description: (d) => [
      `${EMOJIS.REFUSED} **STATUS: REFUSED**`,
      '> This report has been refused by staff.',
      '',
      `${EMOJIS.STAFF} **REFUSED BY**`,
      `> ${d.staffMention}`,
      '',
      `${EMOJIS.REFUSED} **REFUSAL REASON**`,
      `\`\`\`${d.refusalReason}\`\`\``,
      ''
    ].join('\n'),
    footer: null,
    thumbnail: null,
    image: null
  },
  most_wanted: {
    color: '#000000',
    author: () => '[SE BUSCA] - Nueva amenaza detectada...',
    title: () => '✖ ✦ H.E.X. ✦',
    description: (d) => [
      '✖ [ **TARGET MARKED FOR TERMINATION** ] ✖',
      '',
      '[ 👤 **SUJETO IDENTIFICADO** ]',
      `\`\`\`${String(d.username).toUpperCase()}\`\`\``,
      d.rid ? `> 🆔 **RID:** \`${d.rid}\`` : '',
      '',
      '[ 🗡 **CARGO IMPUTADO** ]     [ ☢ **NIVEL DE CORRUPCION** ]', // TODO: Estas categorías deben estar una al lado de la otra
      `> ${d.chargeLabel}     ${'▰'.repeat(Math.floor(d.corruptionPercent / 10)).padEnd(10, '▱')} ${d.corruptionPercent}%`,
      '',
      '[ 🗒 **INFORME DE OPERACIONES** ]',
      `\`\`\`ansi\n\u001b[1;36m${d.reason}\u001b[0m\n\`\`\``,
      '',
      '[ 🏷 **CODIGOS DE AMENAZA** ]',
      `#${d.threatCode}`,
      ''
    ].join('\n'),
    footer: (d) => `LOG_BY: ${d.logBy} // ${d.loggedAt} // ID #${d.reportId}`,
    thumbnail: (d) => d.avatarUrl || 'https://cdn.discordapp.com/emojis/1485764447653068810.png',
    image: (d) => d.firstImageUrl || null
  },
  log_accepted: {
    color: '#000000',
    author: (d) => `REPORT #${d.reportId} | ACCEPTED`,
    title: null,
    description: (d) => [
      `${EMOJIS.USER} **REPORTED USER**`,
      `> ${d.username}`,
      '',
      `${EMOJIS.STAFF} **CERTIFIED BY**`,
      `> ${d.staffMention}`,
      '',
      `${EMOJIS.REASON} **REASON**`,
      `> ${d.reason}`,
      '',
      `${EMOJIS.REPORTER} **REPORTER**`,
      `${d.reporterDisplay}`,
      ''
    ].join('\n'),
    footer: () => 'Report Accepted',
    thumbnail: null,
    image: (d) => d.firstImageUrl || null
  },
  log_refused: {
    color: '#000000',
    author: (d) => `REPORT #${d.reportId} | REFUSED`,
    title: null,
    description: (d) => [
      `${EMOJIS.USER} **REPORTED USER**`,
      `\`\`\`ansi\n\u001b[1;33m${d.username}\u001b[0m\n\`\`\``,
      '',
      `${EMOJIS.STAFF} **REFUSED BY**`,
      `> ${d.staffMention}`,
      '',
      `${EMOJIS.REASON} **ORIGINAL REASON**`,
      `\`\`\`ansi\n\u001b[1;36m${d.reason}\u001b[0m\n\`\`\``,
      '',
      `${EMOJIS.REFUSED} **REFUSAL REASON**`,
      `\`\`\`${d.refusalReason}\`\`\``,
      '',
      `${EMOJIS.REPORTER} **REPORTER**`,
      `${d.reporterDisplay}`,
      ''
    ].join('\n'),
    footer: () => 'Report Refused',
    thumbnail: null,
    image: (d) => d.firstImageUrl || null
  },
  dm_refused: {
    color: '#000000',
    author: null,
    title: (d) => `❌ Report #${d.reportId} Refused`,
    description: (d) => `Your report against **${d.username}** has been refused.`,
    fields: (d) => [
      { name: 'Original Reason', value: d.reason },
      { name: 'Refusal Reason', value: d.refusalReason }
    ],
    footer: null,
    thumbnail: null,
    image: null
  }
};

class EmbedService {
  constructor(client) {
    this.client = client;
  }

  build(templateName, data, withClientFooter = true) {
    const t = EMBED_TEMPLATES[templateName];
    if (!t) throw new Error(`Unknown embed template: "${templateName}"`);

    const embed = new EmbedBuilder().setColor(t.color).setTimestamp();

    if (t.author) embed.setAuthor({ name: t.author(data), iconURL: null });
    if (t.title) embed.setTitle(t.title(data));
    if (t.description) embed.setDescription(t.description(data));
    const thumbnailUrl = t.thumbnail ? (typeof t.thumbnail === 'function' ? t.thumbnail(data) : t.thumbnail) : null;
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    if (t.fields) embed.addFields(...t.fields(data));

    const image = t.image ? t.image(data) : null;
    if (image) embed.setImage(image);

    const footerText = t.footer ? t.footer(data) : null;
    if (footerText) {
      if (withClientFooter && this.client?.user) {
        embed.setFooter({ text: footerText, iconURL: this.client.user.displayAvatarURL() });
      } else {
        embed.setFooter({ text: footerText });
      }
    }

    return embed;
  }

  createAdditionalImageEmbeds(imageUrls, withFooter = true) {
    const embeds = [];
    for (let i = 1; i < imageUrls.length; i += 1) {
      const embed = new EmbedBuilder().setColor('#000000').setImage(imageUrls[i]);
      if (withFooter) {
        embed.setFooter({ text: `Evidence ${i + 1}` });
      }
      embeds.push(embed);
    }
    return embeds;
  }

  createVideoEmbeds(videoUrls, clickableText = 'Click to watch') {
    return videoUrls.map((url, index) => (
      new EmbedBuilder()
        .setColor('#000000')
        .setTitle(`Video Evidence ${index + 1}`)
        .setURL(url)
        .setDescription(clickableText)
        .setTimestamp()
    ));
  }

  createReportActionRow(reportId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${reportId}`).setLabel('ACCEPT REPORT').setEmoji('✅').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`refuse_${reportId}`).setLabel('REFUSE REPORT').setEmoji('❌').setStyle(ButtonStyle.Secondary)
    );
  }

  createWantedListEmbed(wantedList, page = 0) {
    const itemsPerPage = 10;
    const wantedArray = Array.from(wantedList.values()).sort((a, b) => b.totalReports - a.totalReports);
    const totalPages = Math.ceil(wantedArray.length / itemsPerPage);
    const start = page * itemsPerPage;
    const pageItems = wantedArray.slice(start, start + itemsPerPage);

    if (wantedArray.length === 0) {
      return new EmbedBuilder()
        .setColor('#000000')
        .setTitle(`${EMOJIS.WANTED_STAR} MOST WANTED LIST ${EMOJIS.WANTED_STAR}`)
        .setDescription('No wanted individuals at this time.')
        .setTimestamp();
    }

    let description = '';
    pageItems.forEach((item, i) => {
      const number = start + i + 1;
      const latestReport = item.reports[item.reports.length - 1];
      description += `**${number}. ${item.originalName}**\n`;
      description += `└ ${EMOJIS.REASON} **Reason:** ${latestReport.reason}\n`;
      description += `└ ${EMOJIS.FILES} **Total Reports:** ${item.totalReports}\n`;
      if (item.totalReports > 1) {
        const previousReasons = item.reports.slice(0, -1).map((r) => r.reason).join(', ');
        description += `└ 📋 **Previous Reasons:** ${previousReasons}\n`;
      }
      description += '\n';
    });

    return new EmbedBuilder()
      .setColor('#000000')
      .setTitle(`${EMOJIS.WANTED_STAR} MOST WANTED LIST ${EMOJIS.WANTED_STAR}`)
      .setDescription(description)
      .setFooter({ text: `Page ${page + 1}/${totalPages} | Total Wanted: ${wantedArray.length}` })
      .setTimestamp();
  }
}

module.exports = {
  EmbedService,
  EMBED_TEMPLATES
};
