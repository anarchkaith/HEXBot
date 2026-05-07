(async () => {
  require('./mostWantedReportMessageBuilder.test');
  await require('./aiReportEnrichmentService.test');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
