import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { SupportTicket, Notification, ChatMessage } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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

// ------------------- Support Tickets Service -------------------
const TICKETS_PATH = 'support_tickets';

export function subscribeToSupportTickets(
  onUpdate: (tickets: SupportTicket[]) => void,
  initialTicketsFallback: SupportTicket[]
) {
  const collectionRef = collection(db, TICKETS_PATH);
  
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      if (snapshot.empty) {
        // If empty, sync initial preseeded tickets to Firestore if we are online
        initialTicketsFallback.forEach((ticket) => {
          saveSupportTicketFirestore(ticket).catch((err) => {
            console.warn('Initial ticket seeding warning:', err);
          });
        });
        onUpdate(initialTicketsFallback);
      } else {
        const tickets: SupportTicket[] = [];
        snapshot.forEach((doc) => {
          tickets.push(doc.data() as SupportTicket);
        });
        // Sort by createdAt descending
        tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onUpdate(tickets);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, TICKETS_PATH);
    }
  );
}

export async function saveSupportTicketFirestore(ticket: SupportTicket): Promise<void> {
  const path = `${TICKETS_PATH}/${ticket.id}`;
  try {
    const docRef = doc(db, TICKETS_PATH, ticket.id);
    await setDoc(docRef, ticket);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ------------------- Notifications Service -------------------
const NOTIFICATIONS_PATH = 'notifications';

export function subscribeToNotifications(
  onUpdate: (notifications: Notification[]) => void,
  initialNotifFallback: Notification[]
) {
  const collectionRef = collection(db, NOTIFICATIONS_PATH);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Seed database
        initialNotifFallback.forEach((noti) => {
          saveNotificationFirestore(noti).catch((err) => {
            console.warn('Initial notifications seeding warning:', err);
          });
        });
        onUpdate(initialNotifFallback);
      } else {
        const list: Notification[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Notification);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onUpdate(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_PATH);
    }
  );
}

export async function saveNotificationFirestore(notification: Notification): Promise<void> {
  const path = `${NOTIFICATIONS_PATH}/${notification.id}`;
  try {
    const docRef = doc(db, NOTIFICATIONS_PATH, notification.id);
    await setDoc(docRef, notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ------------------- Forum Discussions Service -------------------
const DISCUSSIONS_PATH = 'discussions';

export interface ForumMessage {
  id: string;
  subjectId: string;
  authorName: string;
  authorRole: 'student' | 'instructor' | 'moderator';
  avatarSeed: string;
  content: string;
  timestamp: string;
  likes: number;
  likedByUser?: boolean;
}

export function subscribeToForumMessages(
  onUpdate: (messages: ForumMessage[]) => void,
  initialMessagesFallback: ForumMessage[]
) {
  const collectionRef = collection(db, DISCUSSIONS_PATH);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      if (snapshot.empty) {
        initialMessagesFallback.forEach((msg) => {
          saveForumMessageFirestore(msg).catch((err) => {
            console.warn('Initial forum messages seeding warning:', err);
          });
        });
        onUpdate(initialMessagesFallback);
      } else {
        const list: ForumMessage[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as ForumMessage);
        });
        // We sort by something relative, or parse arbitrary date handles on the component itself if needed
        onUpdate(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, DISCUSSIONS_PATH);
    }
  );
}

export async function saveForumMessageFirestore(message: ForumMessage): Promise<void> {
  const path = `${DISCUSSIONS_PATH}/${message.id}`;
  try {
    const docRef = doc(db, DISCUSSIONS_PATH, message.id);
    await setDoc(docRef, message);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
