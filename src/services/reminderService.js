const cron = require('node-cron');
// const { db } = require('../config/firebase');

module.exports = (client) => {
    // Runs every day at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log('Running daily event check...');

        // 1. Query Firebase for events happening within the next 24 hours
        // 2. Loop through the results
        // 3. Fetch the specific Discord channel using client.channels.cache.get('CHANNEL_ID')
        // 4. Send a message pinging the attendees array
    });
};