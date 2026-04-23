const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rsvp')
        .setDescription('RSVP to an upcoming event.')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('The ID of the event to RSVP to')
                .setRequired(true)),
    async execute(interaction) {
        const eventId = interaction.options.getString('event_id');

        await interaction.reply(`RSVPing to event ${eventId}...`);
    },
};
