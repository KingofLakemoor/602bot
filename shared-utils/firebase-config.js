import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let db = null;
let isInitialized = false;

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
 * Implements collection, doc, onSnapshot, get, set, update.
 */
function createMockFirestore() {
  const store = new Map();
  const listeners = new Map();

  return {
    isMock: true,
    collection(colName) {
      return {
        doc(docId) {
          const key = `${colName}/${docId}`;
          return {
            async get() {
              const data = store.get(key) || null;
              return {
                exists: data !== null,
                id: docId,
                data: () => data
              };
            },
            async set(data) {
              store.set(key, data);
              notify(colName, docId, data);
              return { writeTime: new Date() };
            },
            async update(data) {
              const prev = store.get(key) || {};
              const next = { ...prev, ...data };
              store.set(key, next);
              notify(colName, docId, next);
              return { writeTime: new Date() };
            },
            onSnapshot(callback, errCallback) {
              const listenerKey = `${colName}/${docId}`;
              if (!listeners.has(listenerKey)) listeners.set(listenerKey, new Set());
              listeners.get(listenerKey).add(callback);

              // Initial emission
              const current = store.get(listenerKey) || null;
              callback({
                exists: current !== null,
                id: docId,
                data: () => current
              });

              return () => {
                const set = listeners.get(listenerKey);
                if (set) set.delete(callback);
              };
            }
          };
        },
        onSnapshot(callback, errCallback) {
          const listenerKey = `col:${colName}`;
          if (!listeners.has(listenerKey)) listeners.set(listenerKey, new Set());
          listeners.get(listenerKey).add(callback);

          const getDocs = () => {
            const docs = [];
            for (const [k, v] of store.entries()) {
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
            const set = listeners.get(listenerKey);
            if (set) set.delete(callback);
          };
        }
      };
    },
    // Seed helper for simulations & testing
    __seed(colName, docId, data) {
      const key = `${colName}/${docId}`;
      store.set(key, data);
      notify(colName, docId, data);
    }
  };

  function notify(colName, docId, data) {
    const docKey = `${colName}/${docId}`;
    if (listeners.has(docKey)) {
      listeners.get(docKey).forEach(cb => {
        try {
          cb({ exists: true, id: docId, data: () => data });
        } catch (e) {
          console.error('[MockFirestore] Listener error:', e);
        }
      });
    }

    const colKey = `col:${colName}`;
    if (listeners.has(colKey)) {
      const docs = [];
      for (const [k, v] of store.entries()) {
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
      listeners.get(colKey).forEach(cb => {
        try {
          cb(snapshot);
        } catch (e) {
          console.error('[MockFirestore] Collection listener error:', e);
        }
      });
    }
  }
}
