import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize core Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Firestore targeting the specific applet database instance
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Storage
export const storage = getStorage(app);

// Initialize standard Google auth provider with forcing Select Account selection
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test Firestore connection on launch
export async function testConnection() {
  try {
    const testDocRef = doc(db, 'test-connection-probe', 'connection');
    await getDocFromServer(testDocRef);
    console.log('Firebase connection validated successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network. Client is offline.");
    } else {
      console.log("Firebase connection response received:", error);
    }
  }
}

// Ensure the connection is run asynchronously
testConnection();

// --- Firestore Error Handlers ---
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
  }
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
  
  console.error('Firestore Error Occurred: ', JSON.stringify(errInfo));
  // Not throwing here avoids uncaught asynchronous exceptions that crash the entire React application
}

// --- Safe Firestore Query Helpers ---
import { 
  Query, 
  DocumentData, 
  QueryConstraint, 
  CollectionReference, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

/**
 * Creates a QueryFieldFilterConstraint safely. If the value is undefined or null, it returns null.
 */
export function safeWhere(
  fieldPath: string,
  opStr: any,
  value: any
): QueryConstraint | null {
  if (value === undefined || value === null) {
    console.warn(`[SafeQuery] Bypassed where() constraint on [${fieldPath}] because value is undefined/null.`);
    return null;
  }
  return where(fieldPath, opStr, value);
}

/**
 * Builds a Query safely. 
 * If any constraint is null (representing a bypassed safeWhere), or if the query contains null/undefined,
 * this function returns null, indicating the query cannot be run.
 */
export function safeQuery<T = DocumentData>(
  baseRef: CollectionReference<T> | Query<T>,
  ...constraints: (QueryConstraint | null | undefined)[]
): Query<T> | null {
  const validConstraints: QueryConstraint[] = [];
  for (const c of constraints) {
    if (c === null || c === undefined) {
      return null; // Entire query is ignored/un-runnable
    }
    validConstraints.push(c);
  }
  return query(baseRef, ...validConstraints);
}

/**
 * Attaches a Firestore listener safely.
 * If the query is null (representing a bypassed query), it calls onNext immediately with an empty mock snapshot
 * and returns a standard empty unsubscribe function.
 */
export function safeOnSnapshot<T = DocumentData>(
  queryInstance: Query<T> | null,
  onNext: (snapshot: { empty: boolean; forEach: (cb: (doc: any) => void) => void; docs: any[] }) => void,
  onError?: (error: any) => void
): () => void {
  if (!queryInstance) {
    // Deliver an empty state immediately and safely
    setTimeout(() => {
      onNext({ empty: true, forEach: () => {}, docs: [] });
    }, 0);
    return () => {};
  }
  try {
    return onSnapshot(queryInstance, onNext as any, onError);
  } catch (err) {
    console.error('[SafeQuery] Error in safeOnSnapshot:', err);
    setTimeout(() => {
      onNext({ empty: true, forEach: () => {}, docs: [] });
    }, 0);
    return () => {};
  }
}
