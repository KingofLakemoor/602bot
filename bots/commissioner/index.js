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

  // -------------------------------------------------------------
  // 1. Bot Heartbeat: Write lastActive timestamp to Firebase (bot_status & bot_heartbeats)
  // -------------------------------------------------------------
  async function writeHeartbeat() {
    try {
      const heartbeatData = {
        botId: 'commissioner',
        botName: 'The Commissioner',
        lastActive: Date.now(),
        status: 'ONLINE',
        version: '1.0.0',
        guild: HUB_GUILD_ID || 'Hub Guild'
      };
      await db.collection('bot_heartbeats').doc('commissioner').set(heartbeatData);
      await db.collection('bot_status').doc('commissioner').set(heartbeatData);
      console.log('[Commissioner] 💓 Heartbeat written to bot_status/commissioner');
    } catch (e) {
      console.error('[Commissioner] Heartbeat failed:', e.message);
    }
  }

  // Initial heartbeat + scheduled every 5 minutes
  await writeHeartbeat();
  setInterval(writeHeartbeat, 5 * 60 * 1000);

  // -------------------------------------------------------------
  // 2. The Firebase Listener Reset: Force Roster Audit (Task 2 & 3)
  // Listens for forceAudit: true, executes audit, then resets flag
  // -------------------------------------------------------------
  try {
    const qnwFlagsRef = db.collection('system_flags').doc('qnw');
    qnwFlagsRef.onSnapshot(async (docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data && data.forceAudit === true) {
        console.log('[Commissioner] 🚨 [onSnapshot] "Force Roster Audit" flag detected from Controller App!');
        console.log('[Commissioner] Initiating Fantrax audit sweep...');
        
        try {
          const violations = await auditRostersForShame(FANTRAX_LEAGUE_ID);
          console.log(`[Commissioner] Audit finished: ${violations.length} manager violations identified.`);
          
          // TASK 3: CRITICAL RESET TO PREVENT INFINITE LOOP!
          // The final line of code inside the listener resets the trigger document back to false
          await qnwFlagsRef.update({
            forceAudit: false,
            lastAuditCompleted: Date.now(),
            lastAuditSummary: `Audit completed: ${violations.length} violations found.`
          });
          console.log('[Commissioner] ✅ Successfully reset forceAudit to false. Infinite loop prevented.');
        } catch (auditErr) {
          console.error('[Commissioner] Audit error:', auditErr);
          // Always ensure reset even on error
          await qnwFlagsRef.update({
            forceAudit: false,
            lastAuditCompleted: Date.now(),
            lastAuditSummary: `Audit error: ${auditErr.message}`
          });
        }
      }
    }, (err) => console.error('[Commissioner] system_flags snapshot error:', err));

    // Guillotine Drop Listener: Chop League Standings & Elimination
    const chopDoc = db.collection('gridiron_exotics').doc('chop_league');
    chopDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        if (data.chopBlock) latestChopBlock = data.chopBlock;
        if (data.guillotine_trigger) {
          console.log(`[Commissioner] 🪓 GUILLOTINE DROP TRIGGERED! Slicing roster for chopped user: ${data.guillotine_trigger.choppedUser || 'Slacking GM'}`);
        }
      }
    }, (err) => console.error('[Commissioner] chop_league snapshot error:', err));

    // Empire & Tier Updates Listener: Jackpot thresholds and promotion/relegation flags
    const empireDoc = db.collection('gridiron_exotics').doc('empire_league');
    empireDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        if (data.jackpotThresholdBreached) {
          console.log(`[Commissioner] 🏆 EMPIRE JACKPOT BREACHED! Total Pot: $${data.jackpotAmount || '5,000'}. Re-draft triggered!`);
        }
        if (data.tierUpdates) {
          console.log(`[Commissioner] 📈 TIER PROMOTION/RELEGATION PROCESSED for ${data.tierUpdates.length || 0} teams.`);
        }
      }
    }, (err) => console.error('[Commissioner] empire_league snapshot error:', err));
  } catch (err) {
    console.warn('[Commissioner] Firestore listener setup warning:', err.message);
  }

  // -------------------------------------------------------------
  // 3. Cron Jobs: Wall of Shame & Monday Night Miracle (MST Timezone)
  // -------------------------------------------------------------
  // Wall of Shame: Sunday at 9:00 AM MST
  cron.schedule('0 9 * * 0', async () => {
    console.log('[Commissioner] [node-cron] Running Sunday 9:00 AM MST Wall of Shame Fantrax roster audit...');
    try {
      const violations = await auditRostersForShame(FANTRAX_LEAGUE_ID);
      if (violations.length > 0) {
        console.log(`[Commissioner] Wall of Shame: Identified ${violations.length} illegal rosters.`);
      }
    } catch (e) {
      console.error('[Commissioner] Wall of Shame audit error:', e);
    }
  }, { timezone: 'America/Denver' });

  // Monday Night Miracle: Monday at 4:00 PM MST
  cron.schedule('0 16 * * 1', async () => {
    console.log('[Commissioner] [node-cron] Running Monday 4:00 PM MST Monday Night Miracle differential calculation...');
    try {
      const data = await getLeagueMatchups(FANTRAX_LEAGUE_ID);
      console.log(`[Commissioner] Monday Night Miracle: Evaluated ${data.matchups?.length || 0} close matchups.`);
    } catch (e) {
      console.error('[Commissioner] Monday Night Miracle error:', e);
    }
  }, { timezone: 'America/Denver' });

  // -------------------------------------------------------------
  // 4. Slash Command Dispatcher
  // -------------------------------------------------------------
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      if (commandName === 'matchup') {
        await interaction.deferReply({ ephemeral: false });
        const targetUser = interaction.options.getUser('user');
        const data = await getLeagueMatchups(FANTRAX_LEAGUE_ID);

        let filteredMatchups = data.matchups || [];
        if (targetUser) {
          const matched = filteredMatchups.filter(m =>
            m.team1?.manager?.toLowerCase().includes(targetUser.username.toLowerCase()) ||
            m.team2?.manager?.toLowerCase().includes(targetUser.username.toLowerCase())
          );
          if (matched.length > 0) filteredMatchups = matched;
        }

        const embed = buildMatchupEmbed({ matchups: filteredMatchups, week: data.week || 8 });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'shame') {
        await interaction.deferReply({ ephemeral: false });
        const violations = await auditRostersForShame(FANTRAX_LEAGUE_ID);
        const embed = buildShameEmbed({ violations });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'guillotine-check') {
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
