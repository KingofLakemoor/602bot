import { Client, GatewayIntentBits, Events } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { getFirestoreDb } from '../../shared-utils/firebase-config.js';
import { getLeagueMatchups, auditRostersForShame, getLeagueStandings } from '../../shared-utils/fantrax-api.js';
import { buildMatchupEmbed, buildShameEmbed, buildGuillotineEmbed } from '../../shared-utils/message-builders.js';

dotenv.config();

const TOKEN = process.env.COMMISSIONER_TOKEN;
const HUB_GUILD_ID = process.env.HUB_GUILD_ID;
const FANTRAX_LEAGUE_ID = process.env.FANTRAX_LEAGUE_IDS || 'gridiron_exotics_2026';

console.log('[Commissioner] Initializing QNW Fantasy Enforcer Bot...');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Cache for real-time Firestore triggers
let latestStandings = null;
let latestChopBlock = [
  { team: "Brad's Benchwarmers", manager: 'Brad_QNW', points: 74.2, gapToSafety: 12.8, dangerLevel: 'EXTREME RISK' },
  { team: 'The Guillotine Bait', manager: 'SleepyJoe', points: 79.5, gapToSafety: 7.5, dangerLevel: 'HIGH ALERT' },
  { team: 'Fourth & Twenty', manager: 'SmokeyP', points: 86.0, gapToSafety: 1.0, dangerLevel: 'SURVIVING BARELY' }
];

export async function initCommissioner() {
  const db = getFirestoreDb();

  // 1. Firebase onSnapshot: Listen for Gridiron Exotics standings & chop league status (including manual overrides from Rick)
  try {
    const chopDoc = db.collection('gridiron_exotics').doc('chop_league');
    chopDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        if (data.chopBlock) latestChopBlock = data.chopBlock;

        // Check if an Admin manual override dropped the blade!
        if (data.guillotine_trigger && data.guillotine_trigger.status === 'DROPPED') {
          console.log(`[Commissioner] 🪓 [onSnapshot] MANUAL OVERRIDE DETECTED! Blade dropped by Admin (${data.guillotine_trigger.droppedBy || 'Rick'}) on victim: ${data.guillotine_trigger.victim}`);
        } else {
          console.log('[Commissioner] [onSnapshot] Chop block updated from Firestore.');
        }
      }
    }, (err) => console.error('[Commissioner] Firestore snapshot error:', err));

    const standingsDoc = db.collection('gridiron_exotics').doc('standings');
    standingsDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        latestStandings = data;
        if (data.shame_audit_requested) {
          console.log('[Commissioner] 🚨 [onSnapshot] Manual Wall of Shame audit requested by Admin via Controller App!');
        } else {
          console.log('[Commissioner] [onSnapshot] Standings updated from Firestore.');
        }
      }
    }, (err) => console.error('[Commissioner] Standings snapshot error:', err));
  } catch (err) {
    console.warn('[Commissioner] Firestore listener setup encountered warning:', err.message);
  }

  // 2. Targeted node-cron schedule: Poll Fantrax on Sunday morning at 09:00 for illegal roster audits
  cron.schedule('0 9 * * 0', async () => {
    console.log('[Commissioner] [node-cron] Running Sunday morning Fantrax roster audit...');
    try {
      const violations = await auditRostersForShame(FANTRAX_LEAGUE_ID);
      if (violations.length > 0) {
        console.log(`[Commissioner] Found ${violations.length} violations in Fantrax audit.`);
      }
    } catch (e) {
      console.error('[Commissioner] Cron audit error:', e);
    }
  });

  // Slash Command Dispatcher
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      if (commandName === 'matchup') {
        // PUBLIC REPLY: Pulls head-to-head records and roasts
        await interaction.deferReply({ ephemeral: false });
        const data = await getLeagueMatchups(FANTRAX_LEAGUE_ID);
        const embed = buildMatchupEmbed({ matchups: data.matchups || [], week: data.week || 8 });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'shame') {
        // PUBLIC REPLY: Audits rosters for injured/bye players
        await interaction.deferReply({ ephemeral: false });
        const violations = await auditRostersForShame(FANTRAX_LEAGUE_ID);
        const embed = buildShameEmbed({ violations });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'guillotine-check') {
        // PUBLIC REPLY: Checks current Chop league block
        await interaction.deferReply({ ephemeral: false });
        const embed = buildGuillotineEmbed({ chopBlock: latestChopBlock, cutLineScore: 85.0 });
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[Commissioner] Command /${commandName} failed:`, err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}` });
      } else {
        await interaction.reply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}`, ephemeral: true });
      }
    }
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[Commissioner] Online as ${c.user.tag}! Monitoring Guild: ${HUB_GUILD_ID || 'All'}`);
  });

  if (TOKEN) {
    await client.login(TOKEN).catch((err) => {
      console.warn('[Commissioner] Discord login skipped (invalid/missing token):', err.message);
    });
  } else {
    console.log('[Commissioner] No COMMISSIONER_TOKEN set. Running in headless / simulator mode.');
  }

  return client;
}

// Auto-run if executed directly via Node / Docker
if (process.argv[1]?.endsWith('commissioner/index.js')) {
  initCommissioner().catch(console.error);
}
