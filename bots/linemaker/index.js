import { Client, GatewayIntentBits, Events } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { getFirestoreDb } from '../../shared-utils/firebase-config.js';
import {
  buildBoardEmbed,
  buildMyActionEmbed,
  buildProClaimEmbed,
  buildLineShiftAlertEmbed
} from '../../shared-utils/message-builders.js';

dotenv.config();

const TOKEN = process.env.LINEMAKER_TOKEN;
const HUB_GUILD_ID = process.env.HUB_GUILD_ID;

console.log('[Linemaker] Initializing ChainLink Sportsbook Bot...');

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let openWindows = [
  {
    eventTitle: 'Chiefs vs 49ers',
    line: 'SF -2.5 (-110)',
    total: 'O/U 47.5',
    closesAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    poolSize: 28450,
    stuckCount: 2
  },
  {
    eventTitle: 'Eagles vs Cowboys',
    line: 'PHI -4.0 (-115)',
    total: 'O/U 51.0',
    closesAt: new Date(Date.now() + 1000 * 60 * 180).toISOString(),
    poolSize: 34100,
    stuckCount: 0
  },
  {
    eventTitle: 'Lions vs Packers',
    line: 'DET -1.5 (-108)',
    total: 'O/U 49.5',
    closesAt: new Date(Date.now() + 1000 * 60 * 240).toISOString(),
    poolSize: 19800,
    stuckCount: 1
  }
];

let isBoardFrozen = false;
let userPortfolios = new Map();

export async function initLinemaker() {
  const db = getFirestoreDb();

  // -------------------------------------------------------------
  // 1. Bot Heartbeat: Write lastActive timestamp to Firebase (bot_status & bot_heartbeats)
  // -------------------------------------------------------------
  async function writeHeartbeat() {
    try {
      const heartbeatData = {
        botId: 'linemaker',
        botName: 'The Linemaker',
        lastActive: Date.now(),
        status: 'ONLINE',
        version: '1.0.0',
        guild: HUB_GUILD_ID || 'Hub Guild'
      };
      await db.collection('bot_heartbeats').doc('linemaker').set(heartbeatData);
      await db.collection('bot_status').doc('linemaker').set(heartbeatData);
      console.log('[Linemaker] 💓 Heartbeat written to bot_status/linemaker');
    } catch (e) {
      console.error('[Linemaker] Heartbeat failed:', e.message);
    }
  }

  await writeHeartbeat();
  setInterval(writeHeartbeat, 5 * 60 * 1000);

  // -------------------------------------------------------------
  // 2. ChainLink Action Alerts (Task 2: db.collection('chainlink_alerts'))
  // Listens for manual broadcast alerts dispatched by Controller App
  // -------------------------------------------------------------
  try {
    const alertsCol = db.collection('chainlink_alerts');
    alertsCol.onSnapshot((snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        // Read latest alert
        const docs = snapshot.docs;
        const latestDoc = docs[docs.length - 1];
        const data = typeof latestDoc.data === 'function' ? latestDoc.data() : latestDoc;
        if (data && data.message) {
          console.log(`[Linemaker] 📢 [onSnapshot] Action Alert detected from Controller App: "${data.message}" (Broadcasted by: ${data.broadcastedBy || 'Admin'})`);
        }
      }
    }, (err) => console.error('[Linemaker] chainlink_alerts snapshot error:', err));

    // Heavy Action Alert on action_board collection (threshold breaches e.g. -300 spread action)
    const actionBoardCol = db.collection('action_board');
    actionBoardCol.onSnapshot((snapshot) => {
      if (snapshot.docs) {
        snapshot.docs.forEach((doc) => {
          const data = typeof doc.data === 'function' ? doc.data() : doc;
          if (data && (data.spreadAction <= -300 || data.heavyActionAlert)) {
            console.log(`[Linemaker] 🚨 HEAVY ACTION BREACH! Matchup: ${data.matchup || 'Game'}, Line: ${data.line || '-300'}. Triggering alert embed.`);
          }
        });
      }
    }, (err) => console.error('[Linemaker] action_board snapshot error:', err));

    // Stuck Pick Audit listener
    const pickAuditCol = db.collection('stuck_pick_audit');
    pickAuditCol.onSnapshot((snapshot) => {
      if (snapshot.docs && snapshot.docs.length > 0) {
        console.log(`[Linemaker] 🔍 Daily Stuck Pick Audit collection populated (${snapshot.docs.length} pending slips audited).`);
      }
    }, (err) => console.error('[Linemaker] stuck_pick_audit snapshot error:', err));

    // Control flags listener (emergency freeze)
    const flagsDoc = db.collection('action_board').doc('control_flags');
    flagsDoc.onSnapshot((docSnapshot) => {
      const data = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
      if (data) {
        isBoardFrozen = Boolean(data.emergency_freeze);
        if (isBoardFrozen) {
          console.log(`[Linemaker] ⚡ [onSnapshot] EMERGENCY BOARD FREEZE ACTIVE! Reason: ${data.reason || 'Manual Halt'}`);
        }
      }
    }, (err) => console.error('[Linemaker] action_board control_flags error:', err));
  } catch (err) {
    console.warn('[Linemaker] Firestore snapshot listener warning:', err.message);
  }

  // -------------------------------------------------------------
  // 3. Cron Job: 48-Hour Scheduling Window Announcement
  // -------------------------------------------------------------
  cron.schedule('0 12 * * 2', () => {
    console.log('[Linemaker] [node-cron] ⏰ 48-HOUR WINDOW OPEN! ChainLink scheduling windows officially open for members.');
  });

  // -------------------------------------------------------------
  // 3. Slash Command Dispatcher (Strict Ephemeral Replies)
  // -------------------------------------------------------------
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    try {
      if (commandName === 'board') {
        await interaction.deferReply({ ephemeral: true });

        const displayWindows = isBoardFrozen
          ? openWindows.map(w => ({ ...w, status: '⚠️ BOARD FROZEN BY ADMIN' }))
          : openWindows;

        const embed = buildBoardEmbed({ windows: displayWindows });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'my-action') {
        await interaction.deferReply({ ephemeral: true });

        const mockPicks = [
          { game: 'Chiefs vs 49ers', pick: '49ers -2.5', odds: '-110', wager: 100, toWin: 190.9, status: isBoardFrozen ? 'HELD IN ESCROW' : 'OPEN' }
        ];

        const embed = buildMyActionEmbed({
          user,
          pendingPicks: mockPicks,
          bankroll: 1420
        });

        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'pro-claim') {
        await interaction.deferReply({ ephemeral: true });

        const previousClaim = userPortfolios.get(user.id);
        const streak = previousClaim ? (previousClaim.streak + 1) : 1;
        const bonus = 100 + (streak * 10);
        const newBalance = (previousClaim?.balance || 1000) + bonus;

        userPortfolios.set(user.id, {
          streak,
          balance: newBalance,
          lastClaim: Date.now()
        });

        const embed = buildProClaimEmbed({
          user,
          streak,
          bonusAmount: bonus,
          newBalance
        });

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[Linemaker] Command /${commandName} failed:`, err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}` });
      } else {
        await interaction.reply({ content: `⚠️ Failed to execute /${commandName}: ${err.message}`, ephemeral: true });
      }
    }
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[Linemaker] Online as ${c.user.tag}! Monitoring Guild: ${HUB_GUILD_ID || 'All'}`);
  });

  if (TOKEN) {
    await client.login(TOKEN).catch((err) => {
      console.warn('[Linemaker] Discord login skipped (invalid/missing token):', err.message);
    });
  } else {
    console.log('[Linemaker] No LINEMAKER_TOKEN set. Running in headless / simulator mode.');
  }

  return client;
}

// Auto-run if executed directly via Node / Docker
if (process.argv[1]?.endsWith('linemaker/index.js')) {
  initLinemaker().catch(console.error);
}
