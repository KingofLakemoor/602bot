const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder.'),
    async execute(interaction) {
        await interaction.reply(`Setting a reminder...`);
    },
};
