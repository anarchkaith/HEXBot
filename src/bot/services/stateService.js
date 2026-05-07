const fs = require('fs');
const {
  sanitizeFolderName,
  ensureDirectory,
  downloadFile,
  fileExtension,
  path
} = require('../utils/fileUtils');

class StateService {
  constructor({ repository, cooldownMs, wantedFolder }) {
    this.repository = repository;
    this.cooldownMs = cooldownMs;
    this.wantedFolder = wantedFolder;

    this.activeReports = new Map();
    this.wantedList = new Map();
    this.cooldowns = new Map();
    this.processedReports = new Set();
    this.reportCounter = 0;
  }

  initialize() {
    const counter = this.repository.loadCounterState();
    this.reportCounter = counter.lastId;
    this.processedReports = new Set(counter.processedReports);

    this.wantedList = this.repository.loadWantedMap();
    this.cooldowns = this.repository.loadCooldownMap();
    this.pruneExpiredCooldowns();

    ensureDirectory(this.wantedFolder);
  }

  persistCounter() {
    this.repository.saveCounterState(this.reportCounter, this.processedReports);
  }

  persistWantedList() {
    this.repository.saveWantedMap(this.wantedList);
  }

  persistCooldowns() {
    this.repository.saveCooldownMap(this.cooldowns);
  }

  pruneExpiredCooldowns() {
    const now = Date.now();
    for (const [userId, ts] of this.cooldowns.entries()) {
      if (now - Number(ts) >= this.cooldownMs) {
        this.cooldowns.delete(userId);
      }
    }
    this.persistCooldowns();
  }

  getNextReportId() {
    this.reportCounter += 1;
    this.persistCounter();
    return this.reportCounter;
  }

  isOnCooldown(userId) {
    const lastTs = Number(this.cooldowns.get(userId));
    if (!lastTs) return false;
    return Date.now() - lastTs < this.cooldownMs;
  }

  setCooldown(userId) {
    this.cooldowns.set(userId, Date.now());
    this.persistCooldowns();
  }

  getRemainingCooldownSeconds(userId) {
    const lastTs = Number(this.cooldowns.get(userId));
    if (!lastTs) return 0;
    const remaining = this.cooldownMs - (Date.now() - lastTs);
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  formatCooldown(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}${remSeconds > 0 ? ` and ${remSeconds} second${remSeconds !== 1 ? 's' : ''}` : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  addWantedReport(username, reportId, reason, reporterTag, timestamp) {
    const key = sanitizeFolderName(username);

    if (!this.wantedList.has(key)) {
      this.wantedList.set(key, {
        username,
        originalName: username,
        reports: [],
        firstReportDate: timestamp,
        lastReportDate: timestamp,
        totalReports: 0
      });
    }

    const entry = this.wantedList.get(key);
    entry.reports.push({
      reportId,
      reason,
      reportedBy: reporterTag,
      date: timestamp.toISOString()
    });
    entry.totalReports = entry.reports.length;
    entry.lastReportDate = timestamp;

    this.persistWantedList();
  }

  async saveEvidenceToFolder({ username, reportId, evidenceFiles, reason, reporterId, reporterTag, timestamp }) {
    const sanitizedName = sanitizeFolderName(username);
    const userFolder = path.join(this.wantedFolder, sanitizedName);
    ensureDirectory(userFolder);

    const evidenceFolder = path.join(userFolder, 'evidence');
    ensureDirectory(evidenceFolder);

    const reasonFilePath = path.join(userFolder, 'reason.txt');
    const reasonEntry = [
      '========================================',
      `REPORT #${reportId}`,
      `Date: ${timestamp.toISOString()}`,
      `Reported by: ${reporterTag} (ID: ${reporterId})`,
      '========================================',
      `Reason: ${reason}`,
      'Evidence Files:',
      ...evidenceFiles.map((f, i) => `  ${i + 1}. ${f.name} (${f.contentType})`),
      '========================================',
      ''
    ].join('\n');

    fs.appendFileSync(reasonFilePath, `${reasonEntry}\n`);

    for (let i = 0; i < evidenceFiles.length; i += 1) {
      const file = evidenceFiles[i];
      const ext = fileExtension(file.name);
      const filename = `${reportId}_${Date.now()}_${i + 1}.${ext}`;
      const destination = path.join(evidenceFolder, filename);
      try {
        await downloadFile(file.url, destination);
      } catch (error) {
        console.error(`❌ Failed to download evidence ${i + 1}:`, error);
      }
    }

    return userFolder;
  }

  getWantedListArraySorted() {
    return Array.from(this.wantedList.values()).sort((a, b) => b.totalReports - a.totalReports);
  }

  addActiveReport(reportId, reportPayload) {
    this.activeReports.set(String(reportId), reportPayload);
  }

  getActiveReport(reportId) {
    return this.activeReports.get(String(reportId));
  }

  markProcessed(reportId) {
    this.processedReports.add(String(reportId));
    this.persistCounter();
  }

  deleteActiveReport(reportId) {
    this.activeReports.delete(String(reportId));
  }

  logReporterAudit(entry) {
    this.repository.appendReporterAudit(entry);
  }

  logSecurityAudit(entry) {
    this.repository.appendSecurityAudit(entry);
  }
}

module.exports = {
  StateService
};
