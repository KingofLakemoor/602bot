import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  getLeagueStandings,
  getLeagueMatchups,
  getLeagueRosters,
  auditRostersForShame
} from '../shared-utils/fantrax-api.js';

import {
  extractTitleTags,
  parseCalendarEvents,
  getCalendarEventsFromFirebase
} from '../shared-utils/calendar-sync.js';

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
} from '../shared-utils/message-builders.js';

import { getFirestoreDb } from '../shared-utils/firebase-config.js';

import {
  commissionerCommands,
  linemakerCommands,
  producerCommands,
  conciergeCommands
} from '../deploy-commands.js';

describe('1. Fantrax API Utility Tests', () => {
  it('should fetch or mock standings correctly', async () => {
    const standings = await getLeagueStandings('gridiron_exotics_2026');
    assert.ok(standings);
    assert.ok(standings.standings || standings.teams || standings.leagueId);
  });

  it('should throw if leagueId is missing in getLeagueStandings', async () => {
    await assert.rejects(async () => {
      await getLeagueStandings('');
    }, /leagueId is required/);
  });

  it('should fetch or mock matchups correctly', async () => {
    const matchups = await getLeagueMatchups('gridiron_exotics_2026');
    assert.ok(matchups);
    assert.ok(matchups.matchups || matchups.leagueId);
  });

  it('should fetch or mock rosters correctly', async () => {
    const rosters = await getLeagueRosters('gridiron_exotics_2026');
    assert.ok(rosters);
    assert.ok(rosters.teams || rosters.rosterInfoList || rosters.leagueId);
  });

  it('should audit rosters and detect violations for /shame', async () => {
    const violations = await auditRostersForShame('gridiron_exotics_2026');
    assert.ok(Array.isArray(violations));
    assert.ok(violations.length > 0);
    assert.ok(violations[0].manager);
    assert.ok(violations[0].issue);
    assert.ok(violations[0].roast);
  });
});

describe('2. Calendar Sync Utility Tests', () => {
  it('should extract title tags from bracketed string', () => {
    const { tags, cleanTitle } = extractTitleTags('[Wine Pairing] Friendsgiving Dinner & Tasting');
    assert.deepStrictEqual(tags, ['Wine Pairing']);
    assert.strictEqual(cleanTitle, 'Friendsgiving Dinner & Tasting');
  });

  it('should default tag to General Social when no brackets present', () => {
    const { tags, cleanTitle } = extractTitleTags('Super Bowl Watch Party');
    assert.deepStrictEqual(tags, ['General Social']);
    assert.strictEqual(cleanTitle, 'Super Bowl Watch Party');
  });

  it('should parse calendar events and categorize target channels', () => {
    const events = [
      { title: '[Wine Pairing] Reserve Tasting', location: 'Lounge' },
      { title: '[Potluck] Dinner Party', location: 'Kitchen' },
      { title: '[NFL Watch] RedZone Sunday', location: 'Bar' },
      { title: '[Reality TV] Rose Finale', location: 'Screening Room' }
    ];

    const parsed = parseCalendarEvents(events);
    assert.strictEqual(parsed.length, 4);
    assert.strictEqual(parsed[0].targetChannel, 'wine-collective');
    assert.strictEqual(parsed[1].targetChannel, 'club-602-kitchen');
    assert.strictEqual(parsed[2].targetChannel, 'the-sports-bar');
    assert.strictEqual(parsed[3].targetChannel, 'scriptless-lounge');
  });

  it('should fetch fallback or Firestore calendar events', async () => {
    const events = await getCalendarEventsFromFirebase();
    assert.ok(Array.isArray(events));
    assert.ok(events.length > 0);
  });
});

describe('3. Discord Message Builders Tests', () => {
  it('should build commissioner matchup embed', () => {
    const matchups = [
      {
        team1: { name: 'Team A', manager: 'UserA', score: 100, projected: 110 },
        team2: { name: 'Team B', manager: 'UserB', score: 95, projected: 105 },
        spread: 'Team A -5',
        trashTalkPrompt: 'Close game!'
      }
    ];
    const embed = buildMatchupEmbed({ matchups, week: 1 });
    assert.ok(embed);
    const data = embed.toJSON();
    assert.ok(data.title.includes('Week 1'));
    assert.strictEqual(data.fields.length, 1);
  });

  it('should build shame embed', () => {
    const violations = [
      { manager: 'Brad', teamName: 'Benchwarmers', issue: 'Starting INJURED player', player: 'CMC', position: 'RB', roast: 'Neglectful' }
    ];
    const embed = buildShameEmbed({ violations });
    assert.ok(embed);
    const data = embed.toJSON();
    assert.ok(data.title.includes('WALL OF SHAME'));
  });

  it('should build guillotine embed', () => {
    const chopBlock = [
      { team: 'Team X', manager: 'UserX', points: 70, gapToSafety: 15, dangerLevel: 'EXTREME RISK' }
    ];
    const embed = buildGuillotineEmbed({ chopBlock, cutLineScore: 85 });
    assert.ok(embed);
    const data = embed.toJSON();
    assert.ok(data.title.includes('GUILLOTINE CHOP BLOCK'));
  });

  it('should build linemaker board embed', () => {
    const windows = [
      { eventTitle: 'Chiefs vs 49ers', line: 'SF -2.5', total: 'O/U 47.5', closesAt: new Date().toISOString(), poolSize: 1000, stuckCount: 0 }
    ];
    const embed = buildBoardEmbed({ windows });
    assert.ok(embed);
  });

  it('should build linemaker my-action embed', () => {
    const embed = buildMyActionEmbed({
      user: { username: 'testuser' },
      pendingPicks: [{ game: 'Game 1', pick: 'SF -2.5', odds: '-110', wager: 100, toWin: 190, status: 'OPEN' }],
      bankroll: 1000
    });
    assert.ok(embed);
  });

  it('should build linemaker pro-claim embed', () => {
    const embed = buildProClaimEmbed({ user: { username: 'testuser' }, streak: 3, bonusAmount: 130, newBalance: 1130 });
    assert.ok(embed);
  });

  it('should build producer cast-tea embed', () => {
    const embed = buildCastTeaEmbed({ show: 'Golden Rose', dramaLeaders: [{ star: 'Vanessa', archetype: 'Villain', dramaPoints: 100, spicyAction: 'Threw drink', fantasyCost: 40 }] });
    assert.ok(embed);
  });

  it('should build producer green-room embed', () => {
    const embed = buildGreenRoomEmbed({ user: { username: 'testuser' }, show: 'Golden Rose', lockedCast: [{ star: 'Vanessa', role: 'Villain', lockStatus: 'LOCKED', projectedDrama: 50, multiplier: '1.5x' }] });
    assert.ok(embed);
  });

  it('should build producer spill embed', () => {
    const embed = buildSpillEmbed({ show: 'Golden Rose', rumor: 'Leaked footage', dramaMeter: 90, source: 'PA' });
    assert.ok(embed);
  });

  it('should build producer eliminated embed', () => {
    const embed = buildEliminatedEmbed({ show: 'Golden Rose', week: 2, eliminatedStars: [{ star: 'Brett', archetype: 'Athlete', exitQuote: 'Bye', pointsEarned: 10 }] });
    assert.ok(embed);
  });

  it('should build concierge events embed', () => {
    const embed = buildConciergeEventsEmbed({ events: [{ title: 'RedZone', dateStr: 'Sunday', location: 'Sky Lounge', rsvpCount: 10, capacity: 20, details: 'Watch Party' }] });
    assert.ok(embed);
  });

  it('should build concierge rsvp confirmation embed', () => {
    const embed = buildRsvpConfirmationEmbed({ user: { username: 'testuser' }, eventTitle: 'RedZone Party', status: 'CONFIRMED', guests: 2 });
    assert.ok(embed);
  });

  it('should build concierge schedule embed', () => {
    const embed = buildScheduleEmbed({ schedule: [{ day: 'Sunday', event: 'RedZone', hours: '12-8', perk: 'Buffet' }] });
    assert.ok(embed);
  });
});

describe('4. Shared Firestore Mock Tests', () => {
  it('should initialize mock store and handle set, update, add, get', async () => {
    const db = getFirestoreDb();
    assert.ok(db);

    const docRef = db.collection('test_col').doc('doc_1');
    await docRef.set({ name: 'Initial', val: 1 });

    const snap1 = await docRef.get();
    assert.strictEqual(snap1.exists, true);
    assert.strictEqual(snap1.data().name, 'Initial');

    await docRef.update({ val: 2 });
    const snap2 = await docRef.get();
    assert.strictEqual(snap2.data().val, 2);

    const addRes = await db.collection('test_col').add({ message: 'Added' });
    assert.ok(addRes.id);

    const colSnap = await db.collection('test_col').get();
    assert.ok(colSnap.size >= 2);
  });
});

describe('5. Slash Command Registration Schema Tests', () => {
  it('should contain valid slash command JSON for all bots', () => {
    assert.strictEqual(commissionerCommands.length, 3);
    assert.strictEqual(linemakerCommands.length, 3);
    assert.strictEqual(producerCommands.length, 4);
    assert.strictEqual(conciergeCommands.length, 3);

    const commissionerNames = commissionerCommands.map(c => c.name);
    assert.deepStrictEqual(commissionerNames, ['matchup', 'shame', 'guillotine-check']);

    const linemakerNames = linemakerCommands.map(c => c.name);
    assert.deepStrictEqual(linemakerNames, ['board', 'my-action', 'pro-claim']);

    const producerNames = producerCommands.map(c => c.name);
    assert.deepStrictEqual(producerNames, ['cast-tea', 'green-room', 'spill', 'eliminated']);

    const conciergeNames = conciergeCommands.map(c => c.name);
    assert.deepStrictEqual(conciergeNames, ['events', 'rsvp', 'schedule']);
  });
});
