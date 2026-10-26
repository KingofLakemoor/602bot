import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getFirestoreDb } from './shared-utils/firebase-config.js';
import {
  getLeagueStandings,
  getLeagueMatchups,
  auditRostersForShame
} from './shared-utils/fantrax-api.js';
import {
  buildMatchupEmbed,
  buildShameEmbed,
  buildGuillotineEmbed,
  buildBoardEmbed,
  buildMyActionEmbed,
  buildProClaimEmbed,
  buildCastTeaEmbed,
  buildGreenRoomEmbed,
  buildSpillEmbed,
  buildEliminatedEmbed,
  buildConciergeEventsEmbed,
  buildRsvpConfirmationEmbed,
  buildScheduleEmbed
} from './shared-utils/message-builders.js';
import {
  deployAllCommands,
  commissionerCommands,
  linemakerCommands,
  producerCommands,
  conciergeCommands
} from './deploy-commands.js';

// Import bots
import { initCommissioner, client as commissionerClient } from './bots/commissioner/index.js';
import { initLinemaker, client as linemakerClient } from './bots/linemaker/index.js';
import { initProducer, client as producerClient } from './bots/producer/index.js';
import { initConcierge, client as conciergeClient } from './bots/concierge/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Firestore db
const db = getFirestoreDb();

// Launch all bots (headless or connected depending on .env tokens)
console.log('[Server] Starting Bot Ecosystem instances...');
initCommissioner().catch(e => console.warn('[Server] Commissioner startup note:', e.message));
initLinemaker().catch(e => console.warn('[Server] Linemaker startup note:', e.message));
initProducer().catch(e => console.warn('[Server] Producer startup note:', e.message));
initConcierge().catch(e => console.warn('[Server] Concierge startup note:', e.message));

// ==============================================================
// 1. FIREBASE AUTHENTICATION & ADMIN GUARDING (TASK 1)
// ==============================================================

// Fetch Admin Array from Firestore (system_config/admins)
app.get('/api/admin/config', async (req, res) => {
  try {
    const adminDoc = await db.collection('system_config').doc('admins').get();
    const data = typeof adminDoc.data === 'function' ? adminDoc.data() : adminDoc;
    const admins = data?.admins || ['rick@club602.com', 'kingoflakemoor@gmail.com', 'admin@qnw.com'];
    res.json({ admins });
  } catch (err: any) {
    res.status(500).json({ error: err.message, admins: ['rick@club602.com', 'kingoflakemoor@gmail.com'] });
  }
});

// Guard validation endpoint
app.post('/api/admin/verify-access', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ authorized: false, error: 'Email required' });
  }

  try {
    const adminDoc = await db.collection('system_config').doc('admins').get();
    const data = typeof adminDoc.data === 'function' ? adminDoc.data() : adminDoc;
    const admins: string[] = data?.admins || ['rick@club602.com', 'kingoflakemoor@gmail.com', 'admin@qnw.com'];

    const isAuthorized = admins.map(a => a.toLowerCase().trim()).includes(email.toLowerCase().trim());

    if (isAuthorized) {
      return res.json({
        authorized: true,
        email,
        role: 'SUPER_ADMIN',
        permissions: ['MANUAL_OVERRIDE_ALL', 'DEPLOY_COMMANDS', 'VIEW_TELEMETRY']
      });
    }

    return res.status(403).json({
      authorized: false,
      email,
      error: 'Access Denied: Your account is not in the Firestore Admin Array (system_config/admins).'
    });
  } catch (err: any) {
    res.status(500).json({ authorized: false, error: err.message });
  }
});

// ==============================================================
// 2. BOT STATUS INDICATORS & HEARTBEATS (TASK 4)
// Threshold: > 6 minutes (360 seconds) old = Offline (Red)
// ==============================================================

app.get('/api/admin/heartbeats', async (req, res) => {
  try {
    const bots = ['commissioner', 'linemaker', 'producer', 'concierge'];
    const heartbeats = [];
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 6 * 60 * 1000; // 6 minutes

    for (const botId of bots) {
      const statusDoc = await db.collection('bot_status').doc(botId).get();
      const hbDoc = await db.collection('bot_heartbeats').doc(botId).get();
      const data = statusDoc.exists
        ? (typeof statusDoc.data === 'function' ? statusDoc.data() : statusDoc)
        : (typeof hbDoc.data === 'function' ? hbDoc.data() : hbDoc);

      const lastActive = data?.lastActive || (now - 1000 * 30);
      const diffMs = now - lastActive;
      const isOnline = diffMs <= OFFLINE_THRESHOLD_MS;

      heartbeats.push({
        botId,
        botName: data?.botName || `The ${botId.charAt(0).toUpperCase() + botId.slice(1)}`,
        lastActive,
        diffSeconds: Math.floor(diffMs / 1000),
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        isOnline
      });
    }

    res.json({ heartbeats, serverTime: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Simulator helper to test 6-min timeout transition
app.post('/api/admin/heartbeats/simulate-timeout', async (req, res) => {
  const { botId = 'commissioner' } = req.body;
  const expiredTime = Date.now() - (7 * 60 * 1000); // 7 minutes ago (> 6 mins)
  await db.collection('bot_heartbeats').doc(botId).update({ lastActive: expiredTime, status: 'OFFLINE' });
  await db.collection('bot_status').doc(botId).update({ lastActive: expiredTime, status: 'OFFLINE' });
  res.json({ success: true, message: `Set ${botId} lastActive to 7 minutes ago. Indicator is now RED (Offline).` });
});

// Simulator helper to pulse fresh heartbeat
app.post('/api/admin/heartbeats/pulse', async (req, res) => {
  const { botId } = req.body;
  const now = Date.now();
  if (botId) {
    await db.collection('bot_heartbeats').doc(botId).update({ lastActive: now, status: 'ONLINE' });
    await db.collection('bot_status').doc(botId).update({ lastActive: now, status: 'ONLINE' });
  } else {
    for (const b of ['commissioner', 'linemaker', 'producer', 'concierge']) {
      await db.collection('bot_heartbeats').doc(b).update({ lastActive: now, status: 'ONLINE' });
      await db.collection('bot_status').doc(b).update({ lastActive: now, status: 'ONLINE' });
    }
  }
  res.json({ success: true, message: 'Heartbeat pulsed. Indicator is now GREEN (Online).' });
});

// ==============================================================
// 3. WIRING THE UI TO FIRESTORE (THE OVERRIDES - TASK 2 & 3)
// ==============================================================

// Task (Commissioner): Force Roster Audit
// Updates system_flags/qnw with { forceAudit: true }
// Bot onSnapshot listener catches it, audits, then resets to false (Task 3)
app.post('/api/admin/override/force-audit', async (req, res) => {
  const { adminUser = 'Rick' } = req.body;
  try {
    const qnwRef = db.collection('system_flags').doc('qnw');
    await qnwRef.update({
      forceAudit: true,
      lastTriggeredBy: adminUser,
      triggeredAt: new Date().toISOString()
    });

    res.json({
      success: true,
      target: 'system_flags/qnw',
      field: 'forceAudit: true',
      message: `Set forceAudit: true in system_flags/qnw. Commissioner will run audit and auto-reset flag to false.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Task (Linemaker): Broadcast Action Alert
// Adds custom message to db.collection('chainlink_alerts')
app.post('/api/admin/override/broadcast-alert', async (req, res) => {
  const { message, adminUser = 'Rick' } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  try {
    const alertDoc = await db.collection('chainlink_alerts').add({
      message,
      broadcastedBy: adminUser,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    });

    res.json({
      success: true,
      target: 'chainlink_alerts',
      alertId: alertDoc.id,
      message: `Saved alert to db.collection('chainlink_alerts'). Linemaker bot onSnapshot notified.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Task (Producer): Trigger Elimination
// Updates status field of specific cast member in db.collection('scriptless_cast')
app.post('/api/admin/override/trigger-elimination', async (req, res) => {
  const { castId, adminUser = 'Rick', reason = 'Admin Elimination Rose Ceremony' } = req.body;
  if (!castId) {
    return res.status(400).json({ error: 'castId required' });
  }

  try {
    const castRef = db.collection('scriptless_cast').doc(castId);
    await castRef.update({
      status: 'ELIMINATED',
      eliminatedAt: new Date().toISOString(),
      eliminatedBy: adminUser,
      eliminationReason: reason
    });

    res.json({
      success: true,
      target: `scriptless_cast/${castId}`,
      field: "status: 'ELIMINATED'",
      message: `Updated ${castId} status to 'ELIMINATED'. Producer bot notified via onSnapshot.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Get list of ScriptLess cast members
app.get('/api/admin/scriptless-cast', async (req, res) => {
  try {
    const snapshot = await db.collection('scriptless_cast').get();
    const cast: any[] = [];
    snapshot.forEach((doc: any) => {
      cast.push(doc.data ? doc.data() : doc);
    });
    res.json({ cast });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Read all Firestore Docs & Event Log
app.get('/api/admin/firestore-state', (req, res) => {
  if (db.__getAllDocs) {
    return res.json({
      documents: db.__getAllDocs(),
      eventLogs: db.__getEventLogs ? db.__getEventLogs() : []
    });
  }
  res.json({ documents: {}, eventLogs: [] });
});

// ==============================================================
// FLEET STATUS & SIMULATOR ROUTES
// ==============================================================

app.get('/api/fleet-status', async (req, res) => {
  const bots = [
    {
      id: 'commissioner',
      name: 'The Commissioner',
      persona: 'QNW Fantasy Enforcer & Trash-Talker',
      guild: process.env.HUB_GUILD_ID ? `Hub Guild (${process.env.HUB_GUILD_ID})` : 'Hub Guild (Unset)',
      status: commissionerClient.isReady() ? 'ONLINE' : (process.env.COMMISSIONER_TOKEN ? 'CONNECTING' : 'SIMULATED'),
      isTokenConfigured: Boolean(process.env.COMMISSIONER_TOKEN),
      integrations: [
        { name: 'system_flags/qnw (forceAudit)', type: 'onSnapshot + Auto-Reset', status: 'ACTIVE' },
        { name: 'bot_heartbeats/commissioner', type: 'Every 5 Mins', status: 'ACTIVE' },
        { name: 'Fantrax Public Endpoints', type: 'node-cron (Sun 9am)', status: 'SCHEDULED' }
      ],
      commands: ['/matchup', '/shame', '/guillotine-check']
    },
    {
      id: 'linemaker',
      name: 'The Linemaker',
      persona: 'ChainLink Sportsbook & Betting Board Alerts',
      guild: process.env.HUB_GUILD_ID ? `Hub Guild (${process.env.HUB_GUILD_ID})` : 'Hub Guild (Unset)',
      status: linemakerClient.isReady() ? 'ONLINE' : (process.env.LINEMAKER_TOKEN ? 'CONNECTING' : 'SIMULATED'),
      isTokenConfigured: Boolean(process.env.LINEMAKER_TOKEN),
      integrations: [
        { name: 'chainlink_alerts Collection', type: 'onSnapshot', status: 'ACTIVE' },
        { name: 'bot_heartbeats/linemaker', type: 'Every 5 Mins', status: 'ACTIVE' }
      ],
      commands: ['/board (ephemeral)', '/my-action (ephemeral)', '/pro-claim (ephemeral)']
    },
    {
      id: 'producer',
      name: 'The Producer',
      persona: 'ScriptLess Reality TV Roster Manager',
      guild: process.env.HUB_GUILD_ID ? `Hub Guild (${process.env.HUB_GUILD_ID})` : 'Hub Guild (Unset)',
      status: producerClient.isReady() ? 'ONLINE' : (process.env.PRODUCER_TOKEN ? 'CONNECTING' : 'SIMULATED'),
      isTokenConfigured: Boolean(process.env.PRODUCER_TOKEN),
      integrations: [
        { name: 'scriptless_cast Collection', type: 'onSnapshot', status: 'ACTIVE' },
        { name: 'bot_heartbeats/producer', type: 'Every 5 Mins', status: 'ACTIVE' }
      ],
      commands: ['/cast-tea', '/green-room (ephemeral)', '/spill', '/eliminated']
    },
    {
      id: 'concierge',
      name: 'The Concierge',
      persona: 'Club 602 Social Scheduling & VIP Hospitality',
      guild: process.env.CLUB602_GUILD_ID ? `Club 602 Standalone (${process.env.CLUB602_GUILD_ID})` : 'Club 602 (Unset)',
      status: conciergeClient.isReady() ? 'ONLINE' : (process.env.CONCIERGE_TOKEN ? 'CONNECTING' : 'SIMULATED'),
      isTokenConfigured: Boolean(process.env.CONCIERGE_TOKEN),
      integrations: [
        { name: 'club602_calendar Sync', type: 'onSnapshot', status: 'ACTIVE' },
        { name: 'bot_heartbeats/concierge', type: 'Every 5 Mins', status: 'ACTIVE' }
      ],
      commands: ['/events', '/rsvp (ephemeral)', '/schedule']
    }
  ];

  res.json({
    ecosystem: 'Club 602 & QNW Bot Ecosystem',
    environment: {
      hubGuildId: process.env.HUB_GUILD_ID || null,
      club602GuildId: process.env.CLUB602_GUILD_ID || null,
      fantraxLeagueIds: process.env.FANTRAX_LEAGUE_IDS || 'gridiron_exotics_2026',
      firebaseServiceAccountConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
      firestoreMode: db.isMock ? 'IN_MEMORY_MOCK' : 'LIVE_FIRESTORE'
    },
    bots
  });
});

app.post('/api/simulate-command', async (req, res) => {
  const { command, options = {}, user = { id: 'usr_77', username: 'Vanguard_GM' } } = req.body;

  try {
    let result = null;

    switch (command) {
      case 'matchup': {
        const data = await getLeagueMatchups(process.env.FANTRAX_LEAGUE_IDS || 'gridiron_exotics_2026');
        const embed = buildMatchupEmbed({ matchups: data.matchups || [], week: data.week || 8 });
        result = { bot: 'Commissioner', command: '/matchup', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'shame': {
        const violations = await auditRostersForShame(process.env.FANTRAX_LEAGUE_IDS || 'gridiron_exotics_2026');
        const embed = buildShameEmbed({ violations });
        result = { bot: 'Commissioner', command: '/shame', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'guillotine-check': {
        const chopBlock = [
          { team: "Brad's Benchwarmers", manager: 'Brad_QNW', points: 74.2, gapToSafety: 12.8, dangerLevel: 'EXTREME RISK' },
          { team: 'The Guillotine Bait', manager: 'SleepyJoe', points: 79.5, gapToSafety: 7.5, dangerLevel: 'HIGH ALERT' },
          { team: 'Fourth & Twenty', manager: 'SmokeyP', points: 86.0, gapToSafety: 1.0, dangerLevel: 'SURVIVING BARELY' }
        ];
        const embed = buildGuillotineEmbed({ chopBlock, cutLineScore: 85.0 });
        result = { bot: 'Commissioner', command: '/guillotine-check', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'board': {
        const windows = [
          { eventTitle: 'Chiefs vs 49ers', line: 'SF -2.5 (-110)', total: 'O/U 47.5', closesAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(), poolSize: 28450, stuckCount: 2 },
          { eventTitle: 'Eagles vs Cowboys', line: 'PHI -4.0 (-115)', total: 'O/U 51.0', closesAt: new Date(Date.now() + 1000 * 60 * 180).toISOString(), poolSize: 34100, stuckCount: 0 }
        ];
        const embed = buildBoardEmbed({ windows });
        result = { bot: 'Linemaker', command: '/board', visibility: 'EPHEMERAL', isEphemeral: true, embed: embed.toJSON() };
        break;
      }
      case 'my-action': {
        const pendingPicks = [
          { game: 'Chiefs vs 49ers', pick: '49ers -2.5', odds: '-110', wager: 100, toWin: 190.9, status: 'OPEN' }
        ];
        const embed = buildMyActionEmbed({ user, pendingPicks, bankroll: 1420 });
        result = { bot: 'Linemaker', command: '/my-action', visibility: 'EPHEMERAL', isEphemeral: true, embed: embed.toJSON() };
        break;
      }
      case 'pro-claim': {
        const embed = buildProClaimEmbed({ user, streak: 5, bonusAmount: 150, newBalance: 1570 });
        result = { bot: 'Linemaker', command: '/pro-claim', visibility: 'EPHEMERAL', isEphemeral: true, embed: embed.toJSON() };
        break;
      }
      case 'cast-tea': {
        const dramaScorers = [
          { star: 'Vanessa V.', archetype: 'The Chief Villain', dramaPoints: 142, spicyAction: 'Threw iced sangria into the infinity pool during the rose dinner.', fantasyCost: 45 },
          { star: 'Tyler \'Bro\' Mac', archetype: 'The Gaslighter', dramaPoints: 98, spicyAction: 'Caught slipping DMs to the head producer.', fantasyCost: 35 }
        ];
        const embed = buildCastTeaEmbed({ show: options.show || 'The Golden Rose', dramaLeaders: dramaScorers });
        result = { bot: 'Producer', command: '/cast-tea', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'green-room': {
        const lockedCast = [
          { star: 'Vanessa V.', role: 'Lead Antagonist', lockStatus: 'LOCKED', projectedDrama: 55, multiplier: '1.5x Captain' }
        ];
        const embed = buildGreenRoomEmbed({ user, show: options.show || 'The Golden Rose', lockedCast });
        result = { bot: 'Producer', command: '/green-room', visibility: 'EPHEMERAL', isEphemeral: true, embed: embed.toJSON() };
        break;
      }
      case 'spill': {
        const rumors = [
          'Anonymous sound engineer reports mic pack picked up Tyler secretly negotiating a post-season podcast deal in the pantry.'
        ];
        const embed = buildSpillEmbed({ show: options.show || 'The Golden Rose', rumor: rumors[0], dramaMeter: 94, source: 'Production Assistant Leak' });
        result = { bot: 'Producer', command: '/spill', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'eliminated': {
        const eliminatedStars = [
          { star: 'Brett \'Pectorals\' Davis', archetype: 'The Fitness Influencer', exitQuote: 'My protein intake in this mansion was fundamentally compromised.', pointsEarned: 14 }
        ];
        const embed = buildEliminatedEmbed({ show: options.show || 'The Golden Rose', week: 5, eliminatedStars });
        result = { bot: 'Producer', command: '/eliminated', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'events': {
        const events = [
          { id: 'ev-1', title: 'Sunday NFL RedZone Watch Party & Craft Cocktails', dateStr: 'This Sunday • 12:30 PM - 8:00 PM EST', location: 'Club 602 Sky Lounge', rsvpCount: 24, capacity: 35 }
        ];
        const embed = buildConciergeEventsEmbed({ events });
        result = { bot: 'Concierge', command: '/events', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      case 'rsvp': {
        const embed = buildRsvpConfirmationEmbed({ user, eventTitle: 'Sunday NFL RedZone Watch Party', status: 'CONFIRMED ON VIP GUESTLIST', guests: 1 });
        result = { bot: 'Concierge', command: '/rsvp', visibility: 'EPHEMERAL', isEphemeral: true, embed: embed.toJSON() };
        break;
      }
      case 'schedule': {
        const schedule = [
          { day: 'Sunday', event: 'RedZone Marathon & Commissioner Court', hours: 'Noon – 11:00 PM', perk: 'Full buffet, 8 screens, fantasy dispute hearings' }
        ];
        const embed = buildScheduleEmbed({ schedule });
        result = { bot: 'Concierge', command: '/schedule', visibility: 'PUBLIC', isEphemeral: false, embed: embed.toJSON() };
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown command /${command}` });
    }

    res.json(result);
  } catch (err: any) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deploy-commands', async (req, res) => {
  try {
    const results = await deployAllCommands();
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Setup Vite middleware for development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Controller App] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
