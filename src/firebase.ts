import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

// Helper to safely resolve environment variables across Vite frontend and Node environment
const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return undefined;
};

export const resolvedFirebaseConfig = {
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || defaultFirebaseConfig.projectId,
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || defaultFirebaseConfig.appId,
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || defaultFirebaseConfig.apiKey,
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId: getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || defaultFirebaseConfig.firestoreDatabaseId,
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || defaultFirebaseConfig.storageBucket,
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || defaultFirebaseConfig.messagingSenderId,
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || defaultFirebaseConfig.measurementId,
  oAuthClientId: getEnvVar('VITE_FIREBASE_OAUTH_CLIENT_ID') || defaultFirebaseConfig.oAuthClientId,
  recaptchaSiteKey: getEnvVar('VITE_FIREBASE_RECAPTCHA_SITE_KEY') || defaultFirebaseConfig.recaptchaSiteKey,
};

export const firebaseConfig = resolvedFirebaseConfig;

// Initialize Firebase App
export const app = initializeApp(resolvedFirebaseConfig);

// CRITICAL: Initialize Firestore with the provisioned firestoreDatabaseId
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logoutUser() {
  await signOut(auth);
}

// Error Handling conforming to Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on application boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'system_config', 'test'));
    console.log('[Firebase] Successfully reached Firestore database instance:', resolvedFirebaseConfig.firestoreDatabaseId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is currently offline or connecting to Firestore.');
    }
  }
}
testFirestoreConnection();
