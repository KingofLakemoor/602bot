const { SlashCommandBuilder } = require('discord.js');
const { doc, updateDoc, arrayUnion } = require('firebase/firestore');
const { db } = require('../../config/firebase');

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
        const userId = interaction.user.id;

        await interaction.deferReply({ ephemeral: true });

        try {
            const eventRef = doc(db, 'events', eventId);

            await updateDoc(eventRef, {
                attendees: arrayUnion(userId)
            });

            await interaction.editReply("You're locked in!");
        } catch (error) {
            console.error('Error handling RSVP:', error);
            await interaction.editReply('There was an error trying to RSVP for this event. Make sure the event ID is correct.');
        }
    },
};
