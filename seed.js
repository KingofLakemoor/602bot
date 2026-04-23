const { collection, addDoc, Timestamp } = require('firebase/firestore');
const { db } = require('./src/config/firebase');

async function seedData() {
    try {
        const eventsRef = collection(db, 'events');

        const nextPuttingEvent = {
            type: 'putting',
            guild_id: process.env.GUILD_ID || 'dummy_guild_id', // Adjust as needed
            title: 'Next Putting League Night',
            datetime: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // One week from now
            location: 'Putting World',
            attendees: []
        };

        const docRef = await addDoc(eventsRef, nextPuttingEvent);
        console.log('Successfully seeded database with event ID:', docRef.id);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedData();
