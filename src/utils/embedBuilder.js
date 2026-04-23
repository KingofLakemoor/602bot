const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildEventMessage(eventData) {
    const embed = new EmbedBuilder()
        .setColor('#0099ff') // You can map different colors to Darts vs Putting vs ChainLink
        .setTitle(eventData.title)
        .addFields(
            { name: 'Location', value: eventData.location, inline: true },
            { name: 'Time', value: `<t:${Math.floor(eventData.timestamp / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: `Currently ${eventData.attendees.length} people going!` });

    const rsvpButton = new ButtonBuilder()
        .setCustomId(`rsvp_${eventData.id}`)
        .setLabel('RSVP Now')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(rsvpButton);

    return { embeds: [embed], components: [row] };
}

module.exports = { buildEventMessage };