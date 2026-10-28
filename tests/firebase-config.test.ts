import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolvedFirebaseConfig } from '../src/firebase.js';

describe('Firebase Configuration Resolution Tests', () => {
  it('should load default configuration from firebase-applet-config.json when env vars are unset', () => {
    assert.ok(resolvedFirebaseConfig.projectId);
    assert.strictEqual(resolvedFirebaseConfig.projectId, 'club602-bots');
    assert.ok(resolvedFirebaseConfig.apiKey);
  });

  it('should export valid firebaseConfig object with required fields', () => {
    assert.ok('apiKey' in resolvedFirebaseConfig);
    assert.ok('projectId' in resolvedFirebaseConfig);
    assert.ok('authDomain' in resolvedFirebaseConfig);
    assert.ok('firestoreDatabaseId' in resolvedFirebaseConfig);
  });
});
