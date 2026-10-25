import { Client, GatewayIntentBits, Events } from 'discord.js';
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

// In-memory cache synced strictly via Firebase onSnapshot
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

let userPortfolios = new Map();

export async function initLinemaker() {
  const db = getFirestoreDb();

  // Firebase onSnapshot only: action_board & stuck_picks
  try {
    const actionBoardCol = db.collection('action_board');
    actionBoardCol.onSnapshot((snapshot) => {
      console.log('[Linemaker] [onSnapshot] action_board event received.');
      if (snapshot.docs && snapshot.docs.length > 0) {
        const loaded = [];
        snapshot.docs.forEach((doc) => {
          const data = typeof doc.data === 'function' ? doc.data() : doc;
          loaded.push(data);
        });
        openWindows = loaded;
      }
    }, (err) => console.error('[Linemaker] action_board snapshot error:', err));

    const stuckPicksCol = db.collection('stuck_picks');
    stuckPicksCol.onSnapshot((snapshot) => {
      console.log('[Linemaker] [onSnapshot] stuck_picks listener triggered.');
      if (snapshot.docs && snapshot.docs.length > 0) {
        console.log(`[Linemaker] Alert: ${snapshot.docs.length} picks currently flagged as stuck in liquidity pool.`);
      }
    }, (err) => console.error('[Linemaker] stuck_picks snapshot error:', err));
  } catch (err) {
    console.warn('[Linemaker] Firestore snapshot listener warning:', err.message);
  }

  // Slash Command Dispatcher (Strict Ephemeral Replies for all Linemaker commands)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    try {
      if (commandName === 'board') {
        // EPHEMERAL REPLY: Displays open ChainLink windows
        await interaction.deferReply({ ephemeral: true });
        const embed = buildBoardEmbed({ windows: openWindows });
        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'my-action') {
        // EPHEMERAL REPLY: Displays user's pending picks
        await interaction.deferReply({ ephemeral: true });

        const mockPicks = [
          { game: 'Chiefs vs 49ers', pick: '49ers -2.5', odds: '-110', wager: 100, toWin: 190.9, status: 'OPEN' },
          { game: 'Eagles vs Cowboys', pick: 'Over 51.0', odds: '-105', wager: 50, toWin: 97.6, status: 'OPEN' }
        ];

        const embed = buildMyActionEmbed({
          user,
          pendingPicks: mockPicks,
          bankroll: 1420
        });

        await interaction.editReply({ embeds: [embed] });
      }

      else if (commandName === 'pro-claim') {
        // EPHEMERAL REPLY: Claims daily login bonus
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
