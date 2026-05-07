const { GatewayIntentBits } = require('discord.js');

const REPORT_COOLDOWN_MS = 1 * 60 * 1000;

const FILES = {
  counter: 'report_counter.json',
  wantedList: 'wanted_list.json',
  cooldowns: 'cooldowns.json',
  reporterAudit: 'reporter_audit.log',
  securityAudit: 'security_audit.log'
};

const EMOJIS = {
  REPORT: '🚨',
  USER: '👤',
  REASON: '📝',
  EVIDENCE: '📸',
  ACCEPTED: '✅',
  REFUSED: '❌',
  PENDING: '⏳',
  WANTED: '👿',
  WANTED_STAR: '⭐',
  STAFF: '🛡️',
  REPORTER: '📝',
  FILES: '📁',
  TIMESTAMP: '⏰',
  ID: '🆔',
  ANONYMOUS: '👤'
};

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];

const BOT_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildPresences
];

module.exports = {
  REPORT_COOLDOWN_MS,
  FILES,
  EMOJIS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  BOT_INTENTS
};
