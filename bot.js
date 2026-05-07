const { createWantedBot } = require('./src/bot/createBot');

function bootstrap() {
  try {
    const bot = createWantedBot();
    bot.start();
    return bot;
  } catch (error) {
    console.error('❌ Failed to bootstrap bot:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  bootstrap();
}

module.exports = {
  createWantedBot,
  bootstrap
};
