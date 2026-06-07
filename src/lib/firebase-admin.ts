import * as admin from 'firebase-admin';

let firebaseAdminEnabled = false;

try {
  if (admin.apps.length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (projectId && clientEmail && privateKey) {
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
      firebaseAdminEnabled = true;
      console.log('[Firebase Admin] Initialized securely via individual ENV variables.');
    } else if (serviceAccountPath) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      firebaseAdminEnabled = true;
      console.log('[Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT_PATH.');
    } else {
      console.warn('[Firebase Admin] No credentials provided for Firebase Admin. JWT validation will use local decode bypass.');
    }
  } else {
    firebaseAdminEnabled = true;
  }
} catch (error) {
  console.error('[Firebase Admin] Failed to initialize Firebase Admin SDK:', error);
}

export { admin, firebaseAdminEnabled };
