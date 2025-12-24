import * as admin from 'firebase-admin';

// =============================================================================
// Firebase Admin SDK Initialization
// =============================================================================

let app: admin.app.App | null = null;
let db: admin.firestore.Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * - Uses FIRESTORE_EMULATOR_HOST for local development
 * - Uses service account credentials for production
 */
export function initializeFirebase(): admin.app.App {
  if (app) {
    return app;
  }

  const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'local-dev';

  if (isEmulator) {
    console.log(`🔥 Firebase using emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    
    // For emulator, we don't need real credentials
    app = admin.initializeApp({
      projectId,
    });
  } else {
    console.log(`🔥 Firebase connecting to production project: ${projectId}`);
    
    // For production, use service account credentials
    const credentialsJson = process.env.FIREBASE_CREDENTIALS_JSON;
    
    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson);
        app = admin.initializeApp({
          credential: admin.credential.cert(credentials),
          projectId,
        });
      } catch (error) {
        console.error('❌ Failed to parse FIREBASE_CREDENTIALS_JSON');
        throw error;
      }
    } else {
      // Use Application Default Credentials (ADC)
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
    }
  }

  return app;
}

/**
 * Get Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  if (db) {
    return db;
  }

  if (!app) {
    initializeFirebase();
  }

  db = admin.firestore();
  
  // Configure Firestore settings
  db.settings({
    ignoreUndefinedProperties: true,
  });

  return db;
}

/**
 * Get Firebase Auth instance
 */
export function getAuth(): admin.auth.Auth {
  if (!app) {
    initializeFirebase();
  }
  return admin.auth();
}

// Collection names
export const Collections = {
  USERS: 'users',
  CALLS: 'calls',
  CALL_IMAGES: 'callImages',
  USER_TOKENS: 'userTokens',
  CALL_STATUS_HISTORY: 'callStatusHistory',
  WHATSAPP_MESSAGES: 'whatsappMessages',
  COUNTERS: 'counters',
} as const;

// Initialize on import
initializeFirebase();

export { admin };

