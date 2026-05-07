const { REST, Routes, SlashCommandBuilder } = require('discord.js');

function getCommands() {
  return [
    new SlashCommandBuilder()
      .setName('report')
      .setDescription('Report a user for rule violations (up to 5 files)')
      .addStringOption((option) => option.setName('username').setDescription('The username of the reported person').setRequired(true))
      .addStringOption((option) => option.setName('reason').setDescription('Reason for the report').setRequired(true))
      .addBooleanOption((option) => option.setName('anonymous').setDescription('Hide your name from the public Most Wanted list?').setRequired(true))
      .addAttachmentOption((option) => option.setName('evidence1').setDescription('Evidence (image or video) - Required').setRequired(true))
      .addAttachmentOption((option) => option.setName('evidence2').setDescription('Additional evidence (optional)').setRequired(false))
      .addAttachmentOption((option) => option.setName('evidence3').setDescription('Additional evidence (optional)').setRequired(false))
      .addAttachmentOption((option) => option.setName('evidence4').setDescription('Additional evidence (optional)').setRequired(false))
      .addAttachmentOption((option) => option.setName('evidence5').setDescription('Additional evidence (optional)').setRequired(false)),
    new SlashCommandBuilder()
      .setName('mwlist')
      .setDescription('Show the Most Wanted list with usernames and reasons')
  ];
}

async function registerSlashCommands({ token, clientId, guildId, commands }) {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands.map((cmd) => cmd.toJSON())
  });
}

module.exports = {
  getCommands,
  registerSlashCommands
};
