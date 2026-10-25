import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { getFirestoreDb } from '../../shared-utils/firebase-config.js';
import {
  buildConciergeEventsEmbed,
  buildRsvpConfirmationEmbed,
  buildScheduleEmbed
} from '../../shared-utils/message-builders.js';

dotenv.config();

const TOKEN = process.env.CONCIERGE_TOKEN;
const CLUB602_GUILD_ID = process.env.CLUB602_GUILD_ID;

console.log('[Concierge] Initializing Club 602 Hospitality & Social Bot...');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let clubEvents = [
  {
    id: 'ev-1',
    title: 'Sunday NFL RedZone Watch Party & Craft Cocktails',
    dateStr: 'This Sunday • 12:30 PM - 8:00 PM EST',
    location: 'Club 602 Sky Lounge (Screen 1 & 2)',
    rsvpCount: 22,
    capacity: 35,
    details: 'Full sound on prime audio system, specialty smoked old fashioneds, and live ChainLink board tracking.'
  },
  {
    id: 'ev-2',
    title: 'The Golden Rose Reality Finale Watch & Live Roast',
    dateStr: 'Wednesday • 7:30 PM EST (Pre-show 7:00 PM)',
    location: 'Private Screening Room B',
    rsvpCount: 16,
    capacity: 20,
    details: 'Champagne on tap, ScriptLess roster payouts, and live confessional microphone setup.'
  },
  {
    id: 'ev-3',
    title: 'Club 602 High-Stakes Fantasy Championship Gala',
    dateStr: 'Saturday Nov 14 • 8:00 PM EST',
    location: 'Main Ballroom 602',
    rsvpCount: 28,
    capacity: 50,
    details: 'Black tie optional. Guillotine survivor trophy presentation and live fantasy auction.'
  }
];

let weeklySchedule = [
  { day: 'Monday', event: 'Member Recovery Lounge', hours: '4:00 PM – 11:00 PM', perk: '2-for-1 Espresso Martinis & Monday Night Football' },
  { day: 'Wednesday', event: 'ScriptLess Reality TV Screening Night', hours: '6:30 PM – Midnight', perk: 'Sparkling Rose specials & live drama pool' },
  { day: 'Thursday', event: 'TNF Prime Showcase & Board Check', hours: '7:00 PM – Midnight', perk: 'ChainLink happy hour odds boost' },
  { day: 'Saturday', event: 'UFC / Fight Night Cinema Room', hours: '8:00 PM – 2:00 AM', perk: 'Craft sliders & VIP lounge pass access' },
  { day: 'Sunday', event: 'RedZone Marathon & Commissioner Court', hours: 'Noon – 11:00 PM', perk: 'Full buffet, 8 screens, fantasy dispute hearings' }
];

let memberRsvps = new Map();
let activeAdminAnnouncement = null;

export async function initConcierge() {
  const db = getFirestoreDb();

  // Firebase Calendar sync and RSVP tracking + Admin Announcements
  try {
    const announcementDoc = db.collection('club602_calendar').doc('announcements');
    announcementDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        activeAdminAnnouncement = data;
        if (data.activeAlert) {
          console.log(`[Concierge] 🍸 [onSnapshot] VIP LOUNGE FLASH ANNOUNCEMENT: "${data.activeAlert}" (Dispatched by Rick & Admins)`);
        }
      }
    }, (err) => console.error('[Concierge] Announcement snapshot error:', err));

    const calendarCol = db.collection('club602_calendar');
    calendarCol.onSnapshot((snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        const loaded = [];
        snapshot.docs.forEach((doc) => {
          if (doc.id !== 'announcements') {
            const data = typeof doc.data === 'function' ? doc.data() : doc;
            loaded.push({ id: doc.id, ...data });
          }
        });
        if (loaded.length > 0) clubEvents = loaded;
      }
    }, (err) => console.error('[Concierge] Calendar snapshot error:', err));

    const rsvpCol = db.collection('club602_rsvps');
    rsvpCol.onSnapshot((snapshot) => {
      if (snapshot.docs) {
        snapshot.docs.forEach((doc) => {
          const data = typeof doc.data === 'function' ? doc.data() : doc;
          memberRsvps.set(doc.id, data);
        });
      }
    }, (err) => console.error('[Concierge] RSVP snapshot error:', err));
  } catch (err) {
    console.warn('[Concierge] Firestore listener warning:', err.message);
  }

  // Slash Command Dispatcher
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, options } = interaction;

    try {
      if (commandName === 'events') {
        // PUBLIC REPLY: Lists upcoming club events and RSVP status
        await interaction.deferReply({ ephemeral: false });
        const embed = buildConciergeEventsEmbed({ events: clubEvents });
        if (activeAdminAnnouncement?.activeAlert) {
          embed.addFields({
            name: '📢 VIP Concierge Announcement',
            value: `*${activeAdminAnnouncement.activeAlert}*`,
            inline: false
          });
        }
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'rsvp') {
        // EPHEMERAL REPLY: Submit or check personal RSVP
        await interaction.deferReply({ ephemeral: true });

        const eventChoice = options.getString('event') || clubEvents[0]?.title || 'Sunday NFL RedZone Watch Party';
        const guests = options.getInteger('guests') ?? 1;

        memberRsvps.set(user.id, {
          event: eventChoice,
          guests,
          confirmedAt: new Date().toISOString(),
          userId: user.id,
          username: user.username
        });

        const embed = buildRsvpConfirmationEmbed({
          user,
          eventTitle: eventChoice,
          status: 'CONFIRMED ON VIP GUESTLIST',
          guests
        });

        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'schedule') {
        // PUBLIC REPLY: View weekly operating hours & lounge calendar
        await interaction.deferReply({ ephemeral: false });
        const embed = buildScheduleEmbed({ schedule: weeklySchedule });
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[Concierge] Command /${commandName} failed:`, err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}` });
      } else {
        await interaction.reply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}`, ephemeral: true });
      }
    }
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[Concierge] Online as ${c.user.tag}! Monitoring Standalone Guild: ${CLUB602_GUILD_ID || 'All'}`);
  });

  if (TOKEN) {
    await client.login(TOKEN).catch((err) => {
      console.warn('[Concierge] Discord login skipped (invalid/missing token):', err.message);
    });
  } else {
    console.log('[Concierge] No CONCIERGE_TOKEN set. Running in headless / simulator mode.');
  }

  return client;
}

// Auto-run if executed directly via Node / Docker
if (process.argv[1]?.endsWith('concierge/index.js')) {
  initConcierge().catch(console.error);
}
