const fs = require('fs');
const { appendJsonLine } = require('../utils/auditLogUtils');

class StateRepository {
  constructor(files) {
    this.files = files;
  }

  loadCounterState() {
    try {
      if (!fs.existsSync(this.files.counter)) {
        return { lastId: 0, processedReports: [] };
      }

      const data = JSON.parse(fs.readFileSync(this.files.counter, 'utf8'));
      return {
        lastId: data.lastId || 0,
        processedReports: Array.isArray(data.processedReports) ? data.processedReports : []
      };
    } catch (error) {
      console.error('Error loading counter file:', error);
      return { lastId: 0, processedReports: [] };
    }
  }

  saveCounterState(lastId, processedReportsSet) {
    try {
      fs.writeFileSync(
        this.files.counter,
        JSON.stringify({
          lastId,
          processedReports: Array.from(processedReportsSet)
        }, null, 2)
      );
    } catch (error) {
      console.error('Error saving counter file:', error);
    }
  }

  loadWantedMap() {
    try {
      if (!fs.existsSync(this.files.wantedList)) {
        return new Map();
      }

      const data = JSON.parse(fs.readFileSync(this.files.wantedList, 'utf8'));
      return new Map(Object.entries(data));
    } catch (error) {
      console.error('Error loading wanted list:', error);
      return new Map();
    }
  }

  saveWantedMap(wantedMap) {
    try {
      fs.writeFileSync(this.files.wantedList, JSON.stringify(Object.fromEntries(wantedMap), null, 2));
    } catch (error) {
      console.error('Error saving wanted list:', error);
    }
  }

  loadCooldownMap() {
    try {
      if (!fs.existsSync(this.files.cooldowns)) {
        return new Map();
      }

      const data = JSON.parse(fs.readFileSync(this.files.cooldowns, 'utf8'));
      return new Map(Object.entries(data));
    } catch (error) {
      console.error('Error loading cooldowns:', error);
      return new Map();
    }
  }

  saveCooldownMap(cooldownMap) {
    try {
      fs.writeFileSync(this.files.cooldowns, JSON.stringify(Object.fromEntries(cooldownMap), null, 2));
    } catch (error) {
      console.error('Error saving cooldowns:', error);
    }
  }

  appendReporterAudit(entry) {
    try {
      appendJsonLine(fs, this.files.reporterAudit, entry);
    } catch (error) {
      console.error('Error writing reporter audit log:', error);
    }
  }

  appendSecurityAudit(entry) {
    try {
      appendJsonLine(fs, this.files.securityAudit, entry);
    } catch (error) {
      console.error('Error writing security audit log:', error);
    }
  }
}

module.exports = {
  StateRepository
};
