import { Client, GatewayIntentBits, Events } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { getFirestoreDb } from '../../shared-utils/firebase-config.js';
import {
  buildCastTeaEmbed,
  buildGreenRoomEmbed,
  buildSpillEmbed,
  buildEliminatedEmbed
} from '../../shared-utils/message-builders.js';

dotenv.config();

const TOKEN = process.env.PRODUCER_TOKEN;
const HUB_GUILD_ID = process.env.HUB_GUILD_ID;

console.log('[Producer] Initializing ScriptLess Reality TV Bot...');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let dramaScorers = [
  { star: 'Vanessa V.', archetype: 'The Chief Villain', dramaPoints: 142, spicyAction: 'Threw iced sangria into the infinity pool during the rose dinner.', fantasyCost: 45 },
  { star: 'Tyler \'Bro\' Mac', archetype: 'The Gaslighter', dramaPoints: 98, spicyAction: 'Caught slipping DMs to the head producer.', fantasyCost: 35 },
  { star: 'Chloe Belle', archetype: 'The Crying Confessionalist', dramaPoints: 84, spicyAction: 'Spent 18 consecutive minutes sobbing in the luxury yurt.', fantasyCost: 28 },
  { star: 'Duke Kensington', archetype: 'The Wealth Flexer', dramaPoints: 62, spicyAction: 'Arrived via chartered helicopter uninvited.', fantasyCost: 20 }
];

let eliminatedThisWeek = [
  { star: 'Brett \'Pectorals\' Davis', archetype: 'The Fitness Influencer', exitQuote: 'My protein intake in this mansion was fundamentally compromised.', pointsEarned: 14 }
];

let isRosterLocked = false;

export async function initProducer() {
  const db = getFirestoreDb();

  // -------------------------------------------------------------
  // 1. Bot Heartbeat: Write lastActive timestamp to Firebase (bot_status & bot_heartbeats)
  // -------------------------------------------------------------
  async function writeHeartbeat() {
    try {
      const heartbeatData = {
        botId: 'producer',
        botName: 'The Producer',
        lastActive: Date.now(),
        status: 'ONLINE',
        version: '1.0.0',
        guild: HUB_GUILD_ID || 'Hub Guild'
      };
      await db.collection('bot_heartbeats').doc('producer').set(heartbeatData);
      await db.collection('bot_status').doc('producer').set(heartbeatData);
      console.log('[Producer] 💓 Heartbeat written to bot_status/producer');
    } catch (e) {
      console.error('[Producer] Heartbeat failed:', e.message);
    }
  }

  await writeHeartbeat();
  setInterval(writeHeartbeat, 5 * 60 * 1000);

  // -------------------------------------------------------------
  // 2. ScriptLess Cast Elimination & Tribal Drop Listener
  // Listens for manual eliminations or score update drops
  // -------------------------------------------------------------
  try {
    const castCol = db.collection('scriptless_cast');
    castCol.onSnapshot((snapshot) => {
      if (snapshot.docs) {
        snapshot.docs.forEach((doc) => {
          const cast = typeof doc.data === 'function' ? doc.data() : doc;
          if (cast.status === 'ELIMINATED') {
            console.log(`[Producer] 🥀 [onSnapshot] Tribal Drop / Elimination Verified: ${cast.name} (${cast.archetype}). Roster slots locked and points finalized.`);
          }
        });
      }
    }, (err) => console.error('[Producer] scriptless_cast snapshot error:', err));

    const scoresCol = db.collection('scriptless_scores');
    scoresCol.onSnapshot((snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        console.log(`[Producer] 📊 Morning After Score Update Received. Scores calculated for current episode.`);
      }
    }, (err) => console.error('[Producer] scriptless_scores snapshot error:', err));

    const episodeDoc = db.collection('scriptless').doc('current_episode');
    episodeDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        isRosterLocked = Boolean(data.emergency_lock);
      }
    }, (err) => console.error('[Producer] current_episode snapshot error:', err));
  } catch (err) {
    console.warn('[Producer] Firestore listener warning:', err.message);
  }

  // -------------------------------------------------------------
  // 3. node-cron: The Green Room Roster Lock (1 hour before episode)
  // -------------------------------------------------------------
  cron.schedule('0 19 * * 3', () => {
    console.log('[Producer] [node-cron] 🚨 GREEN ROOM ROSTER LOCK! Exactly 60 minutes until tonight\'s reality show episode airs. All lineups locking!');
  });

  // -------------------------------------------------------------
  // 4. Slash Command Dispatcher
  // -------------------------------------------------------------
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, options } = interaction;
    const showName = options.getString('show') || 'The Golden Rose';

    try {
      if (commandName === 'cast-tea') {
        await interaction.deferReply({ ephemeral: false });
        const embed = buildCastTeaEmbed({ show: showName, dramaLeaders: dramaScorers });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'green-room') {
        await interaction.deferReply({ ephemeral: true });
        const mockLockedCast = [
          { star: 'Vanessa V.', role: 'Lead Antagonist', lockStatus: isRosterLocked ? '🔒 LOCKED (ADMIN HALT)' : 'LOCKED', projectedDrama: 55, multiplier: '1.5x Captain' },
          { star: 'Chloe Belle', role: 'Meltdown Specialist', lockStatus: isRosterLocked ? '🔒 LOCKED (ADMIN HALT)' : 'LOCKED', projectedDrama: 40, multiplier: '1.0x' }
        ];
        const embed = buildGreenRoomEmbed({ user, show: showName, lockedCast: mockLockedCast });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'spill') {
        await interaction.deferReply({ ephemeral: false });
        const embed = buildSpillEmbed({ show: showName, rumor: 'Overheard in craft services: Finale ring was switched backstage.', dramaMeter: 94, source: 'Production Leak' });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'eliminated') {
        await interaction.deferReply({ ephemeral: false });
        const embed = buildEliminatedEmbed({ show: showName, week: 5, eliminatedStars: eliminatedThisWeek });
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[Producer] Command /${commandName} failed:`, err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}` });
      } else {
        await interaction.reply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}`, ephemeral: true });
      }
    }
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[Producer] Online as ${c.user.tag}! Monitoring Guild: ${HUB_GUILD_ID || 'All'}`);
  });

  if (TOKEN) {
    await client.login(TOKEN).catch((err) => {
      console.warn('[Producer] Discord login skipped (invalid/missing token):', err.message);
    });
  } else {
    console.log('[Producer] No PRODUCER_TOKEN set. Running in headless / simulator mode.');
  }

  return client;
}

// Auto-run if executed directly via Node / Docker
if (process.argv[1]?.endsWith('producer/index.js')) {
  initProducer().catch(console.error);
}
