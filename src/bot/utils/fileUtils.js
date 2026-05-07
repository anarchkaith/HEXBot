const fs = require('fs');
const path = require('path');
const https = require('https');

function sanitizeFolderName(name) {
  return String(name).replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function ensureDirectory(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

async function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (error) => {
        fs.unlink(targetPath, () => { });
        reject(error);
      });
  });
}

function fileExtension(filename) {
  const ext = path.extname(filename || '').replace('.', '');
  return ext || 'bin';
}

module.exports = {
  sanitizeFolderName,
  ensureDirectory,
  downloadFile,
  fileExtension,
  path
};
