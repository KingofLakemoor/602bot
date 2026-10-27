import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let db = null;
let isInitialized = false;

// Shared in-memory store for fallback & real-time telemetry inspection
const mockStore = new Map();
const mockListeners = new Map();
const eventLog = [];

/**
 * Initializes and returns the shared Firestore instance.
 * Gracefully handles missing service account by logging helpful guidance or using local fallback.
 */
export function getFirestoreDb() {
  if (db) return db;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || (fs.existsSync(path.resolve('./firebase-service-account.json')) ? './firebase-service-account.json' : null);

  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));
    }

    if (serviceAccount) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      db = admin.firestore();
      isInitialized = true;
      console.log('[Firebase] Successfully initialized Firestore with service account credential.');
      return db;
    } else if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      db = admin.firestore();
      isInitialized = true;
      console.log('[Firebase] Initialized Firestore via default application credentials.');
      return db;
    } else {
      console.warn('[Firebase] No Service Account credentials found (safe for development). Using Mock Firestore provider for local simulation.');
      db = createMockFirestore();
      return db;
    }
  } catch (err) {
    console.warn('[Firebase] Firestore init failed, falling back to mock provider:', err.message);
    db = createMockFirestore();
    return db;
  }
}

/**
 * In-memory Mock Firestore to ensure bot containers and controller app don't crash.
 * Implements collection, doc, onSnapshot, get, set, update, add, and real-time state introspection.
 */
function createMockFirestore() {
  const now = Date.now();

  // Pre-seed realistic collections for Day 1
  if (mockStore.size === 0) {
    // 1. Admin Array for Auth Guarding
    mockStore.set('system_config/admins', {
      admins: [
        'rick@club602.com',
        'kingoflakemoor@gmail.com',
        'admin@qnw.com'
      ],
      updatedAt: new Date().toISOString()
    });

    // 2. System Flags (Commissioner Force Roster Audit & Auto-Reset)
    mockStore.set('system_flags/qnw', {
      forceAudit: false,
      lastAuditCompleted: now - 1000 * 60 * 15,
      lastAuditSummary: 'Routine audit clear. 0 violations found.',
      lastTriggeredBy: null,
      lastUpdated: new Date().toISOString()
    });

    // 3. ChainLink Action Alerts Collection (Linemaker)
    mockStore.set('chainlink_alerts/alert_init_1', {
      id: 'alert_init_1',
      message: '🚨 Sharp action on 49ers -2.5. Line moved to -3.5. Liquidity window closing.',
      broadcastedBy: 'System Engine',
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      timestamp: now - 1000 * 60 * 30
    });

    // 4. ScriptLess Cast Collection (Producer Reality TV Eliminations)
    mockStore.set('scriptless_cast/vanessa_v', {
      id: 'vanessa_v',
      name: 'Vanessa V.',
      archetype: 'The Chief Villain',
      status: 'ACTIVE',
      dramaPoints: 142,
      lastUpdated: new Date().toISOString()
    });
    mockStore.set('scriptless_cast/tyler_mac', {
      id: 'tyler_mac',
      name: 'Tyler "Bro" Mac',
      archetype: 'The Gaslighter',
      status: 'ACTIVE',
      dramaPoints: 98,
      lastUpdated: new Date().toISOString()
    });
    mockStore.set('scriptless_cast/chloe_belle', {
      id: 'chloe_belle',
      name: 'Chloe Belle',
      archetype: 'The Crying Confessionalist',
      status: 'ACTIVE',
      dramaPoints: 84,
      lastUpdated: new Date().toISOString()
    });
    mockStore.set('scriptless_cast/duke_kensington', {
      id: 'duke_kensington',
      name: 'Duke Kensington',
      archetype: 'The Wealth Flexer',
      status: 'ACTIVE',
      dramaPoints: 62,
      lastUpdated: new Date().toISOString()
    });
    mockStore.set('scriptless_cast/brett_davis', {
      id: 'brett_davis',
      name: 'Brett "Pectorals" Davis',
      archetype: 'The Fitness Influencer',
      status: 'ELIMINATED',
      eliminatedAt: 'Episode 5 Ceremony',
      dramaPoints: 34,
      lastUpdated: new Date().toISOString()
    });

    // 5. Bot Heartbeats & Bot Status (4 Bots, updated every 5 mins, red if > 6 mins)
    const bots = ['commissioner', 'linemaker', 'producer', 'concierge'];
    bots.forEach((bId) => {
      const bData = {
        botId: bId,
        botName: `The ${bId.charAt(0).toUpperCase() + bId.slice(1)}`,
        lastActive: now - 1000 * 30,
        version: '1.0.0',
        status: 'ONLINE'
      };
      mockStore.set(`bot_heartbeats/${bId}`, bData);
      mockStore.set(`bot_status/${bId}`, bData);
    });

    // 6. Additional Guild / League docs
    mockStore.set('gridiron_exotics/chop_league', {
      leagueName: 'Gridiron Exotics Guillotine',
      cutLineScore: 85.0,
      chopBlock: [
        { team: "Brad's Benchwarmers", manager: 'Brad_QNW', points: 74.2, gapToSafety: 12.8, dangerLevel: 'EXTREME RISK' },
        { team: 'The Guillotine Bait', manager: 'SleepyJoe', points: 79.5, gapToSafety: 7.5, dangerLevel: 'HIGH ALERT' },
        { team: 'Fourth & Twenty', manager: 'SmokeyP', points: 86.0, gapToSafety: 1.0, dangerLevel: 'SURVIVING BARELY' }
      ],
      guillotine_trigger: null,
      lastUpdated: new Date().toISOString()
    });
  }

  return {
    isMock: true,
    collection(colName) {
      return {
        doc(docId) {
          const key = `${colName}/${docId}`;
          return {
            async get() {
              const data = mockStore.get(key) || null;
              return {
                exists: data !== null,
                id: docId,
                data: () => data
              };
            },
            async set(data) {
              mockStore.set(key, data);
              logEvent(colName, docId, 'SET', data);
              notify(colName, docId, data);
              return { writeTime: new Date() };
            },
            async update(data) {
              const prev = mockStore.get(key) || {};
              const next = { ...prev, ...data, lastUpdated: new Date().toISOString() };
              mockStore.set(key, next);
              logEvent(colName, docId, 'UPDATE', data);
              notify(colName, docId, next);
              return { writeTime: new Date() };
            },
            onSnapshot(callback, errCallback) {
              const listenerKey = `${colName}/${docId}`;
              if (!mockListeners.has(listenerKey)) mockListeners.set(listenerKey, new Set());
              mockListeners.get(listenerKey).add(callback);

              const current = mockStore.get(key) || null;
              callback({
                exists: current !== null,
                id: docId,
                data: () => current
              });

              return () => {
                const set = mockListeners.get(listenerKey);
                if (set) set.delete(callback);
              };
            }
          };
        },
        async add(data) {
          const docId = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const key = `${colName}/${docId}`;
          const fullData = { id: docId, ...data, createdAt: data.createdAt || new Date().toISOString() };
          mockStore.set(key, fullData);
          logEvent(colName, docId, 'ADD', fullData);
          notify(colName, docId, fullData);
          return { id: docId, writeTime: new Date() };
        },
        async get() {
          const docs = [];
          for (const [k, v] of mockStore.entries()) {
            if (k.startsWith(`${colName}/`)) {
              const id = k.split('/')[1];
              docs.push({ id, data: () => v, exists: true });
            }
          }
          return {
            docs,
            size: docs.length,
            empty: docs.length === 0,
            forEach: (fn) => docs.forEach(fn)
          };
        },
        onSnapshot(callback, errCallback) {
          const listenerKey = `col:${colName}`;
          if (!mockListeners.has(listenerKey)) mockListeners.set(listenerKey, new Set());
          mockListeners.get(listenerKey).add(callback);

          const getDocs = () => {
            const docs = [];
            for (const [k, v] of mockStore.entries()) {
              if (k.startsWith(`${colName}/`)) {
                const id = k.split('/')[1];
                docs.push({ id, data: () => v, exists: true });
              }
            }
            return {
              docs,
              size: docs.length,
              empty: docs.length === 0,
              forEach: (fn) => docs.forEach(fn)
            };
          };

          callback(getDocs());

          return () => {
            const set = mockListeners.get(listenerKey);
            if (set) set.delete(callback);
          };
        }
      };
    },
    __seed(colName, docId, data) {
      const key = `${colName}/${docId}`;
      mockStore.set(key, data);
      logEvent(colName, docId, 'SEED', data);
      notify(colName, docId, data);
    },
    __getAllDocs() {
      const obj = {};
      for (const [k, v] of mockStore.entries()) {
        obj[k] = v;
      }
      return obj;
    },
    __getEventLogs() {
      return [...eventLog].reverse().slice(0, 30);
    }
  };

  function logEvent(colName, docId, action, payload) {
    eventLog.push({
      id: Math.random().toString(36).substring(7),
      path: `${colName}/${docId}`,
      action,
      payload,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    if (eventLog.length > 60) eventLog.shift();
  }

  function notify(colName, docId, data) {
    const docKey = `${colName}/${docId}`;
    if (mockListeners.has(docKey)) {
      mockListeners.get(docKey).forEach(cb => {
        try {
          cb({ exists: true, id: docId, data: () => data });
        } catch (e) {
          console.error('[MockFirestore] Doc Listener error:', e);
        }
      });
    }

    const colKey = `col:${colName}`;
    if (mockListeners.has(colKey)) {
      const docs = [];
      for (const [k, v] of mockStore.entries()) {
        if (k.startsWith(`${colName}/`)) {
          docs.push({ id: k.split('/')[1], data: () => v, exists: true });
        }
      }
      const snapshot = {
        docs,
        size: docs.length,
        empty: docs.length === 0,
        forEach: (fn) => docs.forEach(fn)
      };
      mockListeners.get(colKey).forEach(cb => {
        try {
          cb(snapshot);
        } catch (e) {
          console.error('[MockFirestore] Col Listener error:', e);
        }
      });
    }
  }
}
