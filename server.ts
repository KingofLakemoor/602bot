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

// ==========================================
// RICK & ADMIN CONTROLLER APP API ROUTES
// ==========================================

// 1. Admin Authentication Check (Rick / Admin session)
app.post('/api/admin/auth', (req, res) => {
  const { passkey, username } = req.body;
  // Rick or Admin authentication
  const validUsers = ['Rick', 'Admin', 'Lead Admin'];
  if (passkey === 'rick602' || passkey === 'admin' || validUsers.includes(username)) {
    return res.json({
      authenticated: true,
      user: {
        username: username || 'Rick',
        role: 'SUPER_ADMIN',
        permissions: ['MANUAL_OVERRIDE_ALL', 'DEPLOY_COMMANDS', 'VIEW_TELEMETRY']
      }
    });
  }
  res.status(401).json({ authenticated: false, error: 'Invalid admin credentials' });
});

// 2. Read live Firestore Document State & Event Log
app.get('/api/admin/firestore-state', (req, res) => {
  if (db.__getAllDocs) {
    return res.json({
      documents: db.__getAllDocs(),
      eventLogs: db.__getEventLogs ? db.__getEventLogs() : []
    });
  }
  res.json({ documents: {}, eventLogs: [] });
});

// 3. Manual Overrides (The Controller App Strategy: Writes flags directly to Firestore documents)
app.post('/api/admin/override', async (req, res) => {
  const { action, payload = {}, adminUser = 'Rick' } = req.body;

  try {
    switch (action) {
      // 🪓 OVERRIDE 1: Trigger Guillotine Blade Drop
      case 'trigger_guillotine': {
        const chopRef = db.collection('gridiron_exotics').doc('chop_league');
        await chopRef.update({
          guillotine_trigger: {
            status: 'DROPPED',
            droppedBy: adminUser,
            victim: payload.victim || "Brad's Benchwarmers",
            cutLineScore: payload.cutLineScore || 85.0,
            timestamp: new Date().toISOString()
          }
        });
        return res.json({
          success: true,
          action,
          message: `Guillotine drop flag written to gridiron_exotics/chop_league by ${adminUser}.`
        });
      }

      // Reset Guillotine
      case 'reset_guillotine': {
        const chopRef = db.collection('gridiron_exotics').doc('chop_league');
        await chopRef.update({
          guillotine_trigger: null
        });
        return res.json({ success: true, action, message: 'Guillotine status reset to active survival.' });
      }

      // ⚡ OVERRIDE 2: Emergency Line Freeze / Shift
      case 'freeze_action_board': {
        const flagsRef = db.collection('action_board').doc('control_flags');
        await flagsRef.update({
          emergency_freeze: true,
          reason: payload.reason || 'Late Breaking NFL Injury News',
          frozenBy: adminUser,
          frozenAt: new Date().toISOString()
        });
        return res.json({
          success: true,
          action,
          message: `Action board emergency freeze written to action_board/control_flags by ${adminUser}.`
        });
      }

      case 'unfreeze_action_board': {
        const flagsRef = db.collection('action_board').doc('control_flags');
        await flagsRef.update({
          emergency_freeze: false,
          reason: null,
          unfrozenBy: adminUser,
          unfrozenAt: new Date().toISOString()
        });
        return res.json({ success: true, action, message: 'Action board thawed and trading resumed.' });
      }

      // 🎬 OVERRIDE 3: Emergency Roster Lock for ScriptLess
      case 'lock_reality_rosters': {
        const episodeRef = db.collection('scriptless').doc('current_episode');
        await episodeRef.update({
          emergency_lock: true,
          reason: payload.reason || 'Airtime Deadline Enforced by Admin',
          lockedBy: adminUser,
          lockedAt: new Date().toISOString()
        });
        return res.json({
          success: true,
          action,
          message: `Roster lockout written to scriptless/current_episode by ${adminUser}.`
        });
      }

      case 'unlock_reality_rosters': {
        const episodeRef = db.collection('scriptless').doc('current_episode');
        await episodeRef.update({
          emergency_lock: false,
          reason: null
        });
        return res.json({ success: true, action, message: 'Roster lock released.' });
      }

      // 🍸 OVERRIDE 4: VIP Lounge Flash Announcement for Club 602
      case 'broadcast_lounge_flash': {
        const announcementRef = db.collection('club602_calendar').doc('announcements');
        await announcementRef.update({
          activeAlert: payload.message || 'Flash Tasting: Reserve Bourbon Vault open for next 60 minutes.',
          priority: payload.priority || 'HIGH',
          postedBy: adminUser,
          postedAt: new Date().toISOString()
        });
        return res.json({
          success: true,
          action,
          message: `VIP announcement written to club602_calendar/announcements by ${adminUser}.`
        });
      }

      case 'clear_lounge_flash': {
        const announcementRef = db.collection('club602_calendar').doc('announcements');
        await announcementRef.update({
          activeAlert: null
        });
        return res.json({ success: true, action, message: 'VIP announcement cleared.' });
      }

      // 🚨 OVERRIDE 5: Trigger Immediate Wall of Shame Audit
      case 'request_shame_audit': {
        const standingsRef = db.collection('gridiron_exotics').doc('standings');
        await standingsRef.update({
          shame_audit_requested: true,
          requestedBy: adminUser,
          requestedAt: new Date().toISOString()
        });
        return res.json({
          success: true,
          action,
          message: `Shame audit trigger flag written to gridiron_exotics/standings by ${adminUser}.`
        });
      }

      default:
        return res.status(400).json({ error: `Unknown override action: ${action}` });
    }
  } catch (err) {
    console.error('Manual override error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FLEET STATUS & SIMULATOR ROUTES
// ==========================================

app.get('/api/fleet-status', (req, res) => {
  const bots = [
    {
      id: 'commissioner',
      name: 'The Commissioner',
      persona: 'QNW Fantasy Enforcer & Trash-Talker',
      guild: process.env.HUB_GUILD_ID ? `Hub Guild (${process.env.HUB_GUILD_ID})` : 'Hub Guild (Unset)',
      status: commissionerClient.isReady() ? 'ONLINE' : (process.env.COMMISSIONER_TOKEN ? 'CONNECTING' : 'SIMULATED'),
      isTokenConfigured: Boolean(process.env.COMMISSIONER_TOKEN),
      integrations: [
        { name: 'Gridiron Exotics (Firebase)', type: 'onSnapshot', status: 'ACTIVE' },
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
        { name: 'ChainLink action_board', type: 'onSnapshot only', status: 'ACTIVE' },
        { name: 'ChainLink stuck_picks', type: 'onSnapshot only', status: 'ACTIVE' }
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
        { name: 'ScriptLess current_episode', type: 'onSnapshot', status: 'ACTIVE' },
        { name: 'Episode Roster-Lock Guard', type: 'node-cron (1h prior)', status: 'SCHEDULED' }
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
        { name: 'Club 602 Calendar Sync', type: 'onSnapshot', status: 'ACTIVE' },
        { name: 'Member RSVP Tracking', type: 'onSnapshot', status: 'ACTIVE' }
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
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Deploy Slash Commands Trigger
app.post('/api/deploy-commands', async (req, res) => {
  try {
    const results = await deployAllCommands();
    res.json({ success: true, results });
  } catch (err) {
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
