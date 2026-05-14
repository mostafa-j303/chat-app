import type { User } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/config.js";

export type UserProfile = {
  uid: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  gender?: string | null;
  age?: number | null;
  photoURL?: string | null;
  countryCode?: string | null;
  online?: boolean;
  lastActiveAt?: Timestamp | null;
};

export type ChatSummary = {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  unreadCounts?: Record<string, number>;
  waitingStreak?: Record<string, number>;
  lastMessage?: string | null;
  lastMessageAt?: Timestamp | null;
  lastSenderId?: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt?: Timestamp | null;
};

export const MESSAGE_STREAK_LIMIT = 2;

function requireDb() {
  const db = getFirestoreDb() as Firestore | null;

  if (!db) {
    throw new Error("Firestore is only available in the browser.");
  }

  return db;
}

export function buildDirectChatId(firstUid: string, secondUid: string) {
  return [firstUid, secondUid].sort().join("__");
}

function getProfileName(profile: Pick<UserProfile, "username" | "displayName" | "email" | "uid">) {
  return profile.username || profile.displayName || profile.email?.split("@")[0] || `User_${profile.uid.slice(0, 5)}`;
}

export async function setCurrentUserOnline(user: User, countryCode: string | null) {
  const db = requireDb();
  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email || null,
      username: user.displayName || user.email?.split("@")[0] || `Guest_${user.uid.slice(0, 4)}`,
      photoURL: user.photoURL || null,
      countryCode,
      online: true,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setCurrentUserOffline(uid: string) {
  const db = requireDb();

  await updateDoc(doc(db, "users", uid), {
    online: false,
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeOnlineUsers(
  currentUid: string,
  onUsers: (users: UserProfile[]) => void,
  onError: (message: string) => void,
) {
  const db = requireDb();
  const usersQuery = query(collection(db, "users"), where("online", "==", true));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      const users = snapshot.docs
        .map((userDoc) => ({ uid: userDoc.id, ...userDoc.data() }) as UserProfile)
        .filter((profile) => profile.uid !== currentUid);

      onUsers(users);
    },
    (error) => onError(error.message),
  );
}

export function subscribeUserChats(
  currentUid: string,
  onChats: (chats: ChatSummary[]) => void,
  onError: (message: string) => void,
) {
  const db = requireDb();
  const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", currentUid));

  return onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats = snapshot.docs.map((chatDoc) => ({ id: chatDoc.id, ...chatDoc.data() }) as ChatSummary);
      onChats(chats);
    },
    (error) => onError(error.message),
  );
}

export async function ensureDirectChat(currentUser: User, otherUser: UserProfile) {
  const db = requireDb();
  const chatId = buildDirectChatId(currentUser.uid, otherUser.uid);
  const chatRef = doc(db, "chats", chatId);

  await setDoc(
    chatRef,
    {
      type: "direct",
      participants: [currentUser.uid, otherUser.uid],
      participantNames: {
        [currentUser.uid]: currentUser.displayName || currentUser.email?.split("@")[0] || "Me",
        [otherUser.uid]: getProfileName(otherUser),
      },
    },
    { merge: true },
  );

  return chatId;
}

export function subscribeChatMessages(
  chatId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (message: string) => void,
) {
  const db = requireDb();
  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      })) as ChatMessage[];

      onMessages(messages);
    },
    (error) => onError(error.message),
  );
}

export async function markChatRead(chatId: string, uid: string) {
  const db = requireDb();

  await updateDoc(doc(db, "chats", chatId), {
    [`unreadCounts.${uid}`]: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function sendDirectMessage({
  chatId,
  senderId,
  recipientId,
  text,
}: {
  chatId: string;
  senderId: string;
  recipientId: string;
  text: string;
}) {
  const db = requireDb();
  const chatRef = doc(db, "chats", chatId);
  const messageRef = doc(collection(db, "chats", chatId, "messages"));

  await runTransaction(db, async (transaction) => {
    const chatSnapshot = await transaction.get(chatRef);

    if (!chatSnapshot.exists()) {
      throw new Error("CHAT_NOT_READY");
    }

    const chat = chatSnapshot.data() as ChatSummary;
    const senderStreak = chat.waitingStreak?.[senderId] || 0;

    if (senderStreak >= MESSAGE_STREAK_LIMIT) {
      throw new Error("MESSAGE_LIMIT_REACHED");
    }

    transaction.set(messageRef, {
      senderId,
      recipientId,
      text,
      createdAt: serverTimestamp(),
    });

    transaction.update(chatRef, {
      lastMessage: text,
      lastSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      [`waitingStreak.${senderId}`]: senderStreak + 1,
      [`waitingStreak.${recipientId}`]: 0,
      [`unreadCounts.${recipientId}`]: increment(1),
      [`unreadCounts.${senderId}`]: 0,
    });
  });
}
