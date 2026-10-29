import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

process.env.PORT = '3099';

before(async () => {
  await import('../server.ts');
  await new Promise(r => setTimeout(r, 500));
});

after(() => {
  setTimeout(() => process.exit(0), 100);
});

const BASE_URL = 'http://127.0.0.1:3099';

describe('Express Server API Integration Tests', () => {
  it('GET /api/admin/config - returns admin email list', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/config`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.admins));
    assert.ok(data.admins.includes('rick@club602.com'));
  });

  it('POST /api/admin/verify-access - allows authorized admin', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rick@club602.com' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.authorized, true);
    assert.strictEqual(data.role, 'SUPER_ADMIN');
  });

  it('POST /api/admin/verify-access - rejects unauthorized user (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'impostor@hacker.com' })
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.authorized, false);
    assert.ok(data.error.includes('Access Denied'));
  });

  it('GET /api/admin/heartbeats - returns all 4 bot statuses', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/heartbeats`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.heartbeats));
    assert.strictEqual(data.heartbeats.length, 4);

    const botIds = data.heartbeats.map((h: any) => h.botId);
    assert.deepStrictEqual(botIds.sort(), ['commissioner', 'concierge', 'linemaker', 'producer']);
  });

  it('POST /api/admin/heartbeats/simulate-timeout & /pulse', async () => {
    const timeoutRes = await fetch(`${BASE_URL}/api/admin/heartbeats/simulate-timeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: 'commissioner' })
    });
    assert.strictEqual(timeoutRes.status, 200);

    const hb1 = await (await fetch(`${BASE_URL}/api/admin/heartbeats`)).json();
    const commissionerHb1 = hb1.heartbeats.find((h: any) => h.botId === 'commissioner');
    assert.strictEqual(commissionerHb1.status, 'OFFLINE');
    assert.strictEqual(commissionerHb1.isOnline, false);

    const pulseRes = await fetch(`${BASE_URL}/api/admin/heartbeats/pulse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botId: 'commissioner' })
    });
    assert.strictEqual(pulseRes.status, 200);

    const hb2 = await (await fetch(`${BASE_URL}/api/admin/heartbeats`)).json();
    const commissionerHb2 = hb2.heartbeats.find((h: any) => h.botId === 'commissioner');
    assert.strictEqual(commissionerHb2.status, 'ONLINE');
    assert.strictEqual(commissionerHb2.isOnline, true);
  });

  it('POST /api/admin/override/force-audit - updates system_flags/qnw', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/override/force-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUser: 'rick@club602.com' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.target, 'system_flags/qnw');
  });

  it('POST /api/admin/override/broadcast-alert - adds chainlink alert', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/override/broadcast-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Heavy sharp move on Chiefs -3.5', adminUser: 'rick@club602.com' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.alertId);
  });

  it('POST /api/admin/override/trigger-elimination - updates cast member', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/override/trigger-elimination`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ castId: 'tyler_mac', adminUser: 'rick@club602.com', reason: 'Tribal vote' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  it('GET /api/admin/scriptless-cast - returns reality cast list', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/scriptless-cast`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.cast));
    assert.ok(data.cast.length > 0);
  });

  it('GET /api/admin/firestore-state - returns documents and logs', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/firestore-state`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.documents);
    assert.ok(data.eventLogs);
  });

  it('GET /api/fleet-status - returns environment and bot details', async () => {
    const res = await fetch(`${BASE_URL}/api/fleet-status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.ecosystem);
    assert.ok(Array.isArray(data.bots));
    assert.strictEqual(data.bots.length, 4);
  });

  describe('Custom Bot Actions & Triggers Studio Endpoints', () => {
    const TEST_ACTION_ID = 'act_vip_lounge_roast_test';

    it('GET /api/admin/actions - returns seeded custom actions', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/actions`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.actions));
      assert.ok(data.actions.length >= 4);
    });

    it('POST /api/admin/actions - creates new custom action', async () => {
      const payload = {
        id: TEST_ACTION_ID,
        commandName: 'vip-lounge-roast',
        botId: 'commissioner',
        description: 'Delivers custom VIP roasts',
        status: 'active',
        visibility: 'public',
        triggerType: 'slash_command',
        embedTitle: '🔥 VIP LOUNGE ROAST',
        embedDescription: 'Your lineup selection belongs in a museum of terrible choices.',
        embedColor: '#d97706',
        fields: [{ name: 'Heat Index', value: '10/10', inline: true }]
      };

      const res = await fetch(`${BASE_URL}/api/admin/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.action.id, TEST_ACTION_ID);
      assert.strictEqual(data.action.commandName, 'vip-lounge-roast');
    });

    it('POST /api/simulate-command - executes custom action', async () => {
      const res = await fetch(`${BASE_URL}/api/simulate-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'vip-lounge-roast' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.command, '/vip-lounge-roast');
      assert.strictEqual(data.bot, 'Commissioner');
      assert.strictEqual(data.isPaused, false);
      assert.strictEqual(data.embed.title, '🔥 VIP LOUNGE ROAST');
    });

    it('POST /api/admin/actions/:id/toggle-pause - pauses custom action', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/actions/${TEST_ACTION_ID}/toggle-pause`, {
        method: 'POST'
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.newStatus, 'paused');
    });

    it('POST /api/simulate-command - handles paused custom action', async () => {
      const res = await fetch(`${BASE_URL}/api/simulate-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'vip-lounge-roast' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.isPaused, true);
      assert.ok(data.embed.title.includes('PAUSED'));
    });

    it('PUT /api/admin/actions/:id - updates custom action', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/actions/${TEST_ACTION_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', embedTitle: '🔥 UPDATED VIP ROAST' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.action.embedTitle, '🔥 UPDATED VIP ROAST');
    });

    it('DELETE /api/admin/actions/:id - deletes custom action', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/actions/${TEST_ACTION_ID}`, {
        method: 'DELETE'
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });
  });

  describe('Slash Command Simulator Endpoints', () => {
    const commands = [
      'matchup', 'shame', 'guillotine-check',
      'board', 'my-action', 'pro-claim',
      'cast-tea', 'green-room', 'spill', 'eliminated',
      'events', 'rsvp', 'schedule'
    ];

    for (const cmd of commands) {
      it(`POST /api/simulate-command - simulates /${cmd}`, async () => {
        const res = await fetch(`${BASE_URL}/api/simulate-command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd })
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.ok(data.bot);
        assert.strictEqual(data.command, `/${cmd}`);
        assert.ok(data.embed);
      });
    }
  });
});
