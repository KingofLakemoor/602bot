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
  { star: 'Brett \'Pectorals\' Davis', archetype: 'The Fitness Influencer', exitQuote: 'My protein intake in this mansion was fundamentally compromised.', pointsEarned: 14 },
  { star: 'Penelope St. Clair', archetype: 'The Socialite', exitQuote: 'None of these peasants have real generational trusts anyway.', pointsEarned: 19 }
];

let producerRumors = [
  'Anonymous sound engineer reports mic pack picked up Tyler secretly negotiating a post-season podcast deal in the pantry.',
  'Producers forced a 3-hour retake of the hot tub fight after someone accidentally named a competing streaming service.',
  'The finale ring was reportedly switched at the last second after a dramatic backstage walkout by the florist.',
  'Two contestants broke curfew to sneak into the editing bay to see who was getting the villain music cue.'
];

let isRosterLocked = false;

export async function initProducer() {
  const db = getFirestoreDb();

  // 1. Firebase onSnapshot: Episode schedules, live scores & manual roster locks from Rick & Admins
  try {
    const episodeDoc = db.collection('scriptless').doc('current_episode');
    episodeDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        if (data.dramaLeaders) dramaScorers = data.dramaLeaders;

        isRosterLocked = Boolean(data.emergency_lock);
        if (isRosterLocked) {
          console.log(`[Producer] 🎬 [onSnapshot] EMERGENCY ROSTER LOCK ACTIVE! Enforced by Admin: ${data.lockedBy || 'Rick'}. All cast trades rejected.`);
        } else {
          console.log('[Producer] [onSnapshot] ScriptLess episode status normal.');
        }
      }
    }, (err) => console.error('[Producer] Firestore snapshot error:', err));
  } catch (err) {
    console.warn('[Producer] Firestore listener warning:', err.message);
  }

  // 2. node-cron: Strict roster-lock alert 1 hour before airtime
  cron.schedule('0 19 * * 3', () => {
    console.log('[Producer] [node-cron] ROSTER LOCK WARNING! 60 minutes until tonight\'s episode airs!');
  });

  // Slash Command Dispatcher
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, options } = interaction;
    const showName = options.getString('show') || 'The Golden Rose';

    try {
      if (commandName === 'cast-tea') {
        // PUBLIC REPLY: Shows top drama scorers per show
        await interaction.deferReply({ ephemeral: false });
        const embed = buildCastTeaEmbed({ show: showName, dramaLeaders: dramaScorers });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'green-room') {
        // EPHEMERAL REPLY: Displays user's locked-in cast
        await interaction.deferReply({ ephemeral: true });

        const mockLockedCast = [
          { star: 'Vanessa V.', role: 'Lead Antagonist', lockStatus: isRosterLocked ? '🔒 LOCKED (ADMIN HALT)' : 'LOCKED', projectedDrama: 55, multiplier: '1.5x Captain' },
          { star: 'Chloe Belle', role: 'Meltdown Specialist', lockStatus: isRosterLocked ? '🔒 LOCKED (ADMIN HALT)' : 'LOCKED', projectedDrama: 40, multiplier: '1.0x' },
          { star: 'Duke Kensington', role: 'Chaos Wildcard', lockStatus: isRosterLocked ? '🔒 LOCKED (ADMIN HALT)' : 'LOCKED', projectedDrama: 25, multiplier: '1.0x' }
        ];

        const embed = buildGreenRoomEmbed({
          user,
          show: showName,
          lockedCast: mockLockedCast
        });

        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'spill') {
        // PUBLIC REPLY: Reality draft rumor
        await interaction.deferReply({ ephemeral: false });
        const randomRumor = producerRumors[Math.floor(Math.random() * producerRumors.length)];
        const embed = buildSpillEmbed({
          show: showName,
          rumor: randomRumor,
          dramaMeter: Math.floor(Math.random() * 20) + 80,
          source: 'Overheard in Craft Services'
        });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'eliminated') {
        // PUBLIC REPLY: Lists reality stars sent home this week
        await interaction.deferReply({ ephemeral: false });
        const embed = buildEliminatedEmbed({
          show: showName,
          week: 5,
          eliminatedStars: eliminatedThisWeek
        });
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
