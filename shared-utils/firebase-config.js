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

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  try {
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      db = admin.firestore();
      isInitialized = true;
      console.log('[Firebase] Successfully initialized Firestore with service account file.');
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
      console.warn('[Firebase] No FIREBASE_SERVICE_ACCOUNT_PATH found or file does not exist yet. Using Mock Firestore provider for local development/simulation.');
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
 * In-memory Mock Firestore to ensure bot containers don't crash before service account is injected.
 * Implements collection, doc, onSnapshot, get, set, update, and real-time state introspection for Rick & Admins.
 */
function createMockFirestore() {
  // Pre-seed realistic collections for Day 1
  if (mockStore.size === 0) {
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

    mockStore.set('action_board/control_flags', {
      emergency_freeze: false,
      activeWindowsCount: 3,
      liquidityAlertThreshold: 50000,
      reason: null,
      lastUpdated: new Date().toISOString()
    });

    mockStore.set('scriptless/current_episode', {
      show: 'The Golden Rose',
      episodeNumber: 5,
      airTime: 'Wednesday 20:00 EST',
      emergency_lock: false,
      dramaLeaders: [
        { star: 'Vanessa V.', archetype: 'The Chief Villain', dramaPoints: 142, spicyAction: 'Threw iced sangria into the infinity pool during the rose dinner.' },
        { star: 'Tyler "Bro" Mac', archetype: 'The Gaslighter', dramaPoints: 98, spicyAction: 'Caught slipping DMs to the head producer.' }
      ],
      lastUpdated: new Date().toISOString()
    });

    mockStore.set('club602_calendar/announcements', {
      bannerText: 'Sunday NFL RedZone Watch Party & Craft Cocktails - Doors open 12:30 PM EST',
      activeAlert: null,
      priority: 'NORMAL',
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

              // Initial emission
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
    // Seed & Introspection helpers for Controller App
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
    if (eventLog.length > 50) eventLog.shift();
  }

  function notify(colName, docId, data) {
    const docKey = `${colName}/${docId}`;
    if (mockListeners.has(docKey)) {
      mockListeners.get(docKey).forEach(cb => {
        try {
          cb({ exists: true, id: docId, data: () => data });
        } catch (e) {
          console.error('[MockFirestore] Listener error:', e);
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
          console.error('[MockFirestore] Collection listener error:', e);
        }
      });
    }
  }
}
