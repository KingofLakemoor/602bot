const { SlashCommandBuilder } = require('discord.js');
const { collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
const { db } = require('../../config/firebase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('next')
        .setDescription('Find the next upcoming community event.')
        .addStringOption(option =>
            option.setName('activity')
                .setDescription('Which activity?')
                .setRequired(true)
                .addChoices(
                    { name: 'Putting', value: 'putting' },
                    { name: 'Darts', value: 'darts' },
                    { name: 'ChainLink', value: 'chainlink' }
                )),
    async execute(interaction) {
        const activity = interaction.options.getString('activity');
        const guildId = interaction.guildId;

        await interaction.deferReply();

        try {
            const eventsRef = collection(db, 'events');
            const q = query(
                eventsRef,
                where('type', '==', activity),
                where('guild_id', '==', guildId),
                orderBy('datetime', 'asc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                await interaction.editReply(`No upcoming ${activity} events found.`);
                return;
            }

            const event = querySnapshot.docs[0].data();
            const date = event.datetime.toDate().toLocaleString(); // Assumes Firebase Timestamp

            await interaction.editReply(
                `Next **${event.title}** is on ${date} at ${event.location}.`
            );
        } catch (error) {
            console.error('Error fetching event:', error);
            await interaction.editReply('There was an error fetching the event details.');
        }
    },
};
