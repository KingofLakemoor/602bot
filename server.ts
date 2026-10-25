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
// CONTROL CENTER API ROUTES
// ==========================================

// 1. Fleet Status & Configuration Health
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

// 2. Command Catalog
app.get('/api/commands', (req, res) => {
  res.json({
    hubGuild: {
      commissioner: commissionerCommands,
      linemaker: linemakerCommands,
      producer: producerCommands
    },
    club602Guild: {
      concierge: conciergeCommands
    }
  });
});

// 3. Interactive Slash Command Simulator
app.post('/api/simulate-command', async (req, res) => {
  const { command, options = {}, user = { id: 'sim_user_1', username: 'QNW_Vanguard' } } = req.body;

  try {
    let result = null;

    switch (command) {
      // COMMISSIONER
      case 'matchup': {
        const data = await getLeagueMatchups(process.env.FANTRAX_LEAGUE_IDS || 'gridiron_exotics_2026');
        const embed = buildMatchupEmbed({ matchups: data.matchups || [], week: data.week || 8 });
        result = {
          bot: 'Commissioner',
          command: '/matchup',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }
      case 'shame': {
        const violations = await auditRostersForShame(process.env.FANTRAX_LEAGUE_IDS || 'gridiron_exotics_2026');
        const embed = buildShameEmbed({ violations });
        result = {
          bot: 'Commissioner',
          command: '/shame',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }
      case 'guillotine-check': {
        const chopBlock = [
          { team: "Brad's Benchwarmers", manager: 'Brad_QNW', points: 74.2, gapToSafety: 12.8, dangerLevel: 'EXTREME RISK' },
          { team: 'The Guillotine Bait', manager: 'SleepyJoe', points: 79.5, gapToSafety: 7.5, dangerLevel: 'HIGH ALERT' },
          { team: 'Fourth & Twenty', manager: 'SmokeyP', points: 86.0, gapToSafety: 1.0, dangerLevel: 'SURVIVING BARELY' }
        ];
        const embed = buildGuillotineEmbed({ chopBlock, cutLineScore: 85.0 });
        result = {
          bot: 'Commissioner',
          command: '/guillotine-check',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }

      // LINEMAKER
      case 'board': {
        const windows = [
          { eventTitle: 'Chiefs vs 49ers', line: 'SF -2.5 (-110)', total: 'O/U 47.5', closesAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(), poolSize: 28450, stuckCount: 2 },
          { eventTitle: 'Eagles vs Cowboys', line: 'PHI -4.0 (-115)', total: 'O/U 51.0', closesAt: new Date(Date.now() + 1000 * 60 * 180).toISOString(), poolSize: 34100, stuckCount: 0 },
          { eventTitle: 'Lions vs Packers', line: 'DET -1.5 (-108)', total: 'O/U 49.5', closesAt: new Date(Date.now() + 1000 * 60 * 240).toISOString(), poolSize: 19800, stuckCount: 1 }
        ];
        const embed = buildBoardEmbed({ windows });
        result = {
          bot: 'Linemaker',
          command: '/board',
          visibility: 'EPHEMERAL',
          isEphemeral: true,
          ephemeralNotice: 'Only you can see this • Megachannel Rule Enforced',
          embed: embed.toJSON()
        };
        break;
      }
      case 'my-action': {
        const pendingPicks = [
          { game: 'Chiefs vs 49ers', pick: '49ers -2.5', odds: '-110', wager: 100, toWin: 190.9, status: 'OPEN' },
          { game: 'Eagles vs Cowboys', pick: 'Over 51.0', odds: '-105', wager: 50, toWin: 97.6, status: 'OPEN' }
        ];
        const embed = buildMyActionEmbed({ user, pendingPicks, bankroll: 1420 });
        result = {
          bot: 'Linemaker',
          command: '/my-action',
          visibility: 'EPHEMERAL',
          isEphemeral: true,
          ephemeralNotice: 'Only you can see this • Megachannel Rule Enforced',
          embed: embed.toJSON()
        };
        break;
      }
      case 'pro-claim': {
        const embed = buildProClaimEmbed({ user, streak: 5, bonusAmount: 150, newBalance: 1570 });
        result = {
          bot: 'Linemaker',
          command: '/pro-claim',
          visibility: 'EPHEMERAL',
          isEphemeral: true,
          ephemeralNotice: 'Only you can see this • Megachannel Rule Enforced',
          embed: embed.toJSON()
        };
        break;
      }

      // PRODUCER
      case 'cast-tea': {
        const dramaScorers = [
          { star: 'Vanessa V.', archetype: 'The Chief Villain', dramaPoints: 142, spicyAction: 'Threw iced sangria into the infinity pool during the rose dinner.', fantasyCost: 45 },
          { star: 'Tyler \'Bro\' Mac', archetype: 'The Gaslighter', dramaPoints: 98, spicyAction: 'Caught slipping DMs to the head producer.', fantasyCost: 35 },
          { star: 'Chloe Belle', archetype: 'The Crying Confessionalist', dramaPoints: 84, spicyAction: 'Spent 18 consecutive minutes sobbing in the luxury yurt.', fantasyCost: 28 }
        ];
        const embed = buildCastTeaEmbed({ show: options.show || 'The Golden Rose', dramaLeaders: dramaScorers });
        result = {
          bot: 'Producer',
          command: '/cast-tea',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }
      case 'green-room': {
        const lockedCast = [
          { star: 'Vanessa V.', role: 'Lead Antagonist', lockStatus: 'LOCKED', projectedDrama: 55, multiplier: '1.5x Captain' },
          { star: 'Chloe Belle', role: 'Meltdown Specialist', lockStatus: 'LOCKED', projectedDrama: 40, multiplier: '1.0x' }
        ];
        const embed = buildGreenRoomEmbed({ user, show: options.show || 'The Golden Rose', lockedCast });
        result = {
          bot: 'Producer',
          command: '/green-room',
          visibility: 'EPHEMERAL',
          isEphemeral: true,
          ephemeralNotice: 'Only you can see this • Megachannel Rule Enforced',
          embed: embed.toJSON()
        };
        break;
      }
      case 'spill': {
        const rumors = [
          'Anonymous sound engineer reports mic pack picked up Tyler secretly negotiating a post-season podcast deal in the pantry.',
          'Producers forced a 3-hour retake of the hot tub fight after someone accidentally named a competing streaming service.',
          'The finale ring was reportedly switched at the last second after a dramatic backstage walkout by the florist.'
        ];
        const rumor = rumors[Math.floor(Math.random() * rumors.length)];
        const embed = buildSpillEmbed({ show: options.show || 'The Golden Rose', rumor, dramaMeter: 94, source: 'Production Assistant Leak' });
        result = {
          bot: 'Producer',
          command: '/spill',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }
      case 'eliminated': {
        const eliminatedStars = [
          { star: 'Brett \'Pectorals\' Davis', archetype: 'The Fitness Influencer', exitQuote: 'My protein intake in this mansion was fundamentally compromised.', pointsEarned: 14 },
          { star: 'Penelope St. Clair', archetype: 'The Socialite', exitQuote: 'None of these peasants have real generational trusts anyway.', pointsEarned: 19 }
        ];
        const embed = buildEliminatedEmbed({ show: options.show || 'The Golden Rose', week: 5, eliminatedStars });
        result = {
          bot: 'Producer',
          command: '/eliminated',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }

      // CONCIERGE
      case 'events': {
        const events = [
          {
            id: 'ev-1',
            title: 'Sunday NFL RedZone Watch Party & Craft Cocktails',
            dateStr: 'This Sunday • 12:30 PM - 8:00 PM EST',
            location: 'Club 602 Sky Lounge (Screen 1 & 2)',
            rsvpCount: 24,
            capacity: 35,
            details: 'Full sound on prime audio system, specialty smoked old fashioneds, and live ChainLink board tracking.'
          },
          {
            id: 'ev-2',
            title: 'The Golden Rose Reality Finale Watch & Live Roast',
            dateStr: 'Wednesday • 7:30 PM EST',
            location: 'Private Screening Room B',
            rsvpCount: 16,
            capacity: 20,
            details: 'Champagne on tap, ScriptLess roster payouts, and live confessional microphone setup.'
          }
        ];
        const embed = buildConciergeEventsEmbed({ events });
        result = {
          bot: 'Concierge',
          command: '/events',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
        break;
      }
      case 'rsvp': {
        const eventTitle = options.event || 'Sunday NFL RedZone Watch Party & Craft Cocktails';
        const guests = options.guests ?? 1;
        const embed = buildRsvpConfirmationEmbed({ user, eventTitle, status: 'CONFIRMED ON VIP GUESTLIST', guests });
        result = {
          bot: 'Concierge',
          command: '/rsvp',
          visibility: 'EPHEMERAL',
          isEphemeral: true,
          ephemeralNotice: 'Only you can see this • Standalone Club 602 Server',
          embed: embed.toJSON()
        };
        break;
      }
      case 'schedule': {
        const schedule = [
          { day: 'Monday', event: 'Member Recovery Lounge', hours: '4:00 PM – 11:00 PM', perk: '2-for-1 Espresso Martinis & Monday Night Football' },
          { day: 'Wednesday', event: 'ScriptLess Reality TV Screening Night', hours: '6:30 PM – Midnight', perk: 'Sparkling Rose specials & live drama pool' },
          { day: 'Thursday', event: 'TNF Prime Showcase & Board Check', hours: '7:00 PM – Midnight', perk: 'ChainLink happy hour odds boost' },
          { day: 'Sunday', event: 'RedZone Marathon & Commissioner Court', hours: 'Noon – 11:00 PM', perk: 'Full buffet, 8 screens, fantasy dispute hearings' }
        ];
        const embed = buildScheduleEmbed({ schedule });
        result = {
          bot: 'Concierge',
          command: '/schedule',
          visibility: 'PUBLIC',
          isEphemeral: false,
          embed: embed.toJSON()
        };
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

// 4. Trigger Simulated Firestore onSnapshot Event
app.post('/api/trigger-firebase-event', (req, res) => {
  const { eventType, payload } = req.body;

  if (db.__seed) {
    switch (eventType) {
      case 'action_board_shift':
        db.__seed('action_board', 'active_games', payload || {
          windows: [
            { eventTitle: 'Chiefs vs 49ers', line: 'SF -3.5 (Moved from -2.5)', total: 'O/U 48.0', closesAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(), poolSize: 34500, stuckCount: 0 }
          ]
        });
        break;
      case 'chop_block_update':
        db.__seed('gridiron_exotics', 'chop_league', payload || {
          chopBlock: [
            { team: "Brad's Benchwarmers", manager: 'Brad_QNW', points: 68.4, gapToSafety: 16.6, dangerLevel: 'CRITICAL ELIMINATION RISK' }
          ]
        });
        break;
      case 'roster_lock_triggered':
        db.__seed('scriptless', 'current_episode', payload || {
          locked: true,
          lockTime: new Date().toISOString()
        });
        break;
      case 'calendar_event_added':
        db.__seed('club602_calendar', 'ev_new', payload || {
          title: 'Emergency VIP Tasting & Draft Session',
          dateStr: 'Friday • 7:00 PM EST',
          location: 'Private Humidor Room',
          rsvpCount: 8,
          capacity: 15
        });
        break;
      default:
        return res.status(400).json({ error: 'Unsupported eventType' });
    }

    return res.json({ success: true, message: `Dispatched ${eventType} into Firestore event stream.` });
  }

  res.json({ success: true, note: 'Trigger received (using live Firestore instance)' });
});

// 5. Deploy Slash Commands Trigger
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
    console.log(`[Control Center] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
