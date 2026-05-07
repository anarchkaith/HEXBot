const { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } = require('../constants');

function isImageFile(contentType) {
  return ALLOWED_IMAGE_TYPES.includes(contentType);
}

function isVideoFile(contentType) {
  return ALLOWED_VIDEO_TYPES.includes(contentType);
}

function isValidFileType(attachment) {
  return isImageFile(attachment.contentType) || isVideoFile(attachment.contentType);
}

function collectEvidence(interaction) {
  const evidenceFiles = [];
  for (let i = 1; i <= 5; i += 1) {
    const evidence = interaction.options.getAttachment(`evidence${i}`);
    if (evidence) evidenceFiles.push(evidence);
  }
  return evidenceFiles;
}

function splitEvidenceByType(evidenceFiles) {
  const imageUrls = [];
  const videoUrls = [];
  let evidenceText = '';

  evidenceFiles.forEach((file, index) => {
    const number = index + 1;
    if (isImageFile(file.contentType)) {
      imageUrls.push(file.url);
      evidenceText += `> 📸 **Evidence ${number}** (Image)\n`;
      return;
    }

    if (isVideoFile(file.contentType)) {
      videoUrls.push(file.url);
      evidenceText += `> 📸 **Evidence ${number}** (Video)\n`;
    }
  });

  return {
    imageUrls,
    videoUrls,
    evidenceText
  };
}

module.exports = {
  isImageFile,
  isVideoFile,
  isValidFileType,
  collectEvidence,
  splitEvidenceByType
};
