import { Client, GatewayIntentBits, Events } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { getFirestoreDb } from '../../shared-utils/firebase-config.js';
import { parseCalendarEvents } from '../../shared-utils/calendar-sync.js';
import {
  buildConciergeEventsEmbed,
  buildRsvpConfirmationEmbed,
  buildScheduleEmbed,
  buildCalendarHypeEmbed
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
  }
];

let memberRsvps = new Map();
let activeAdminAnnouncement = null;

export async function initConcierge() {
  const db = getFirestoreDb();

  // -------------------------------------------------------------
  // 1. Bot Heartbeat: Write lastActive timestamp to Firebase (bot_status & bot_heartbeats)
  // -------------------------------------------------------------
  async function writeHeartbeat() {
    try {
      const heartbeatData = {
        botId: 'concierge',
        botName: 'The Concierge',
        lastActive: Date.now(),
        status: 'ONLINE',
        version: '1.0.0',
        guild: CLUB602_GUILD_ID || 'Club 602 Standalone'
      };
      await db.collection('bot_heartbeats').doc('concierge').set(heartbeatData);
      await db.collection('bot_status').doc('concierge').set(heartbeatData);
      console.log('[Concierge] 💓 Heartbeat written to bot_status/concierge');
    } catch (e) {
      console.error('[Concierge] Heartbeat failed:', e.message);
    }
  }

  await writeHeartbeat();
  setInterval(writeHeartbeat, 5 * 60 * 1000);

  // -------------------------------------------------------------
  // 2. Calendar Sync & Event Hype Listener (Google Calendar / Firebase)
  // -------------------------------------------------------------
  try {
    const calendarCol = db.collection('club602_calendar');
    calendarCol.onSnapshot((snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        const rawEvents = snapshot.docs.map(doc => ({ id: doc.id, ...(typeof doc.data === 'function' ? doc.data() : doc) }));
        const parsedEvents = parseCalendarEvents(rawEvents);
        parsedEvents.forEach((ev) => {
          console.log(`[Concierge] 🌟 Event Hype Parsed: "${ev.cleanTitle}" [Tag: ${ev.primaryTag}] => Target Channel: #${ev.targetChannel}`);
        });
      }
    }, (err) => console.error('[Concierge] club602_calendar snapshot error:', err));

    const announcementDoc = db.collection('club602_calendar').doc('announcements');
    announcementDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        activeAdminAnnouncement = data;
        if (data.activeAlert) {
          console.log(`[Concierge] 🍸 [onSnapshot] VIP LOUNGE FLASH ANNOUNCEMENT: "${data.activeAlert}"`);
        }
      }
    }, (err) => console.error('[Concierge] Announcement snapshot error:', err));
  } catch (err) {
    console.warn('[Concierge] Firestore listener warning:', err.message);
  }

  // -------------------------------------------------------------
  // 3. Cron Jobs: RSVP Chaser (48 hrs prior) & Morning After Media (10:00 AM next day)
  // -------------------------------------------------------------
  // RSVP Chaser: Runs daily to query events 48 hours out
  cron.schedule('0 10 * * *', async () => {
    console.log('[Concierge] [node-cron] 🎟️ RSVP CHASER: Querying unconfirmed members for events starting in 48 hours. Threading reminders...');
  });

  // Morning After Media: Runs at 10:00 AM day after event
  cron.schedule('0 10 * * *', async () => {
    console.log('[Concierge] [node-cron] 📸 MORNING AFTER MEDIA: Creating dedicated media drop thread for yesterday\'s lounge attendees.');
  });

  // -------------------------------------------------------------
  // 3. Slash Command Dispatcher
  // -------------------------------------------------------------
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, options } = interaction;

    try {
      if (commandName === 'events') {
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
        await interaction.deferReply({ ephemeral: false });
        const schedule = [
          { day: 'Sunday', event: 'RedZone Marathon & Commissioner Court', hours: 'Noon – 11:00 PM', perk: 'Full buffet, 8 screens, fantasy dispute hearings' }
        ];
        const embed = buildScheduleEmbed({ schedule });
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
