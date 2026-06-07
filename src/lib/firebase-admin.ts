import * as admin from 'firebase-admin';

export function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return { app: admin.apps[0]!, enabled: true };
  }

  let firebaseAdminEnabled = false;
  let app: admin.app.App | null = null;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey && privateKey.trim()) {
      // Support both literal newline chars and double-escaped standard ENV raw strings:
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n').replace(/\n/g, '\n');
      
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId || '',
          clientEmail: clientEmail || '',
          privateKey: formattedPrivateKey,
        }),
      });
      firebaseAdminEnabled = true;
      console.log('[Firebase Admin] Successfully initialized with direct environment variables.');
    } else if (serviceAccountPath) {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      firebaseAdminEnabled = true;
      console.log('[Firebase Admin] Successfully initialized with service account path.');
    } else {
      console.log('[Firebase Admin] No service account or environment credentials found. Running in local fallback mode.');
    }
  } catch (err) {
    console.error('[Firebase Admin] Lazy initialization skipped/failed:', err);
  }

  return { app, enabled: firebaseAdminEnabled };
}
