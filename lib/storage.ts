import type { User } from "firebase/auth";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AppData,
  ChatMessage,
  Client,
  EventItem,
  PaidItem,
  Post,
  PostStatus,
  UserProfile,
  UserRole
} from "./types";

export const STORAGE_KEY = "calpost:v1";
export const PREFERRED_CLIENT_KEY = "calpost:activeClientId";
export const DATA_VERSION = 1;
const AXIS_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#D946EF", "#06B6D4"];
const PAID_CHANNEL_DEFAULTS = [
  "Google search / Meta Ads",
  "Google Ads",
  "LinkedIn Ads",
  "TikTok Ads",
  "Programmatic"
];
const VALID_STATUSES: PostStatus[] = [
  "no_iniciado",
  "en_proceso",
  "esperando_feedback",
  "aprobado",
  "publicada"
];

export function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

export function createEmptyData(): AppData {
  return {
    version: DATA_VERSION,
    activeClientId: "",
    clients: [],
    postsByClient: {},
    eventsByClient: {},
    paidByClient: {}
  };
}

export function clearLegacyLocalData() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getPreferredClientId() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(PREFERRED_CLIENT_KEY);
}

export function setPreferredClientId(clientId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(PREFERRED_CLIENT_KEY, clientId);
}

function normalizeStatus(status: string | undefined): PostStatus {
  if (status && VALID_STATUSES.includes(status as PostStatus)) {
    return status as PostStatus;
  }
  return "no_iniciado";
}

function asIso(value?: Timestamp | string | null) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toDate().toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Record<string, unknown>;
}

function normalizeClient(client: Client): Client {
  const axes = (client.axes ?? []).map((axis, index) => ({
    ...axis,
    color: axis.color ?? AXIS_COLORS[index % AXIS_COLORS.length]
  }));
  const enablePaid = client.enablePaid ?? false;
  const paidChannels =
    enablePaid && client.paidChannels && client.paidChannels.length > 0
      ? client.paidChannels
      : enablePaid
        ? PAID_CHANNEL_DEFAULTS
        : [];
  return {
    ...client,
    channels: client.channels ?? [],
    axes,
    enablePaid,
    paidChannels
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile: UserProfile = {
      id: user.uid,
      role: "member",
      allowedClients: [],
      displayName: user.displayName ?? undefined,
      email: user.email ?? undefined
    };
    await setDoc(ref, {
      role: profile.role,
      allowedClients: profile.allowedClients,
      displayName: profile.displayName ?? null,
      email: profile.email ?? null
    });
    return profile;
  }

  const data = snap.data() as Partial<UserProfile> & { role?: UserRole };
  const profile: UserProfile = {
    id: user.uid,
    role: data.role === "admin" ? "admin" : "member",
    allowedClients: Array.isArray(data.allowedClients) ? data.allowedClients : [],
    displayName: data.displayName ?? user.displayName ?? undefined,
    email: data.email ?? user.email ?? undefined
  };

  await updateDoc(ref, {
    displayName: profile.displayName ?? null,
    email: profile.email ?? null
  });

  return profile;
}

export async function fetchClientsForProfile(profile: UserProfile): Promise<Client[]> {
  if (profile.role === "admin") {
    const snap = await getDocs(collection(db, "clients"));
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as Client;
      return normalizeClient({ ...data, id: docSnap.id });
    });
  }

  const clientPromises = profile.allowedClients.map(async (clientId) => {
    const snap = await getDoc(doc(db, "clients", clientId));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as Client;
    return normalizeClient({ ...data, id: snap.id });
  });
  const clients = await Promise.all(clientPromises);
  return clients.filter(Boolean) as Client[];
}

export async function createClient(name: string, user: User, enablePaid = false) {
  const clientRef = doc(collection(db, "clients"));
  const newClient: Client = normalizeClient({
    id: clientRef.id,
    name: name.trim(),
    channels: ["Instagram"],
    paidChannels: enablePaid ? PAID_CHANNEL_DEFAULTS : [],
    enablePaid,
    axes: [{ id: makeId(), name: "Eje A", color: AXIS_COLORS[0] }]
  });

  await setDoc(clientRef, {
    name: newClient.name,
    channels: newClient.channels,
    paidChannels: newClient.paidChannels,
    enablePaid: newClient.enablePaid,
    axes: newClient.axes,
    createdAt: serverTimestamp(),
    createdBy: user.uid
  });

  return newClient;
}

export async function updateClient(clientId: string, patch: Partial<Client>) {
  const ref = doc(db, "clients", clientId);
  await updateDoc(ref, stripUndefined({
    name: patch.name,
    channels: patch.channels,
    paidChannels: patch.paidChannels,
    enablePaid: patch.enablePaid,
    axes: patch.axes,
    logoDataUrl: patch.logoDataUrl
  }));
}

function normalizeChat(messages: unknown) {
  if (!Array.isArray(messages)) {
    return [] as ChatMessage[];
  }
  return messages
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const message = item as ChatMessage & { createdAt?: Timestamp | string | null };
      const createdAt = asIso(message.createdAt) ?? nowIso();
      return {
        id: message.id ?? makeId(),
        author: message.author ?? "Agencia",
        text: message.text ?? "",
        createdAt
      } satisfies ChatMessage;
    })
    .filter(Boolean) as ChatMessage[];
}

export async function loadClientMonthData(clientId: string, monthKey: string) {
  const postsSnap = await getDocs(
    query(collection(db, "clients", clientId, "posts"), where("monthKey", "==", monthKey))
  );
  const eventsSnap = await getDocs(
    query(collection(db, "clients", clientId, "events"), where("monthKey", "==", monthKey))
  );
  const paidSnap = await getDocs(
    query(collection(db, "clients", clientId, "paids"), where("monthKey", "==", monthKey))
  );

  const posts = postsSnap.docs.map((snap) => {
    const data = snap.data() as Partial<Post> & {
      createdAt?: Timestamp | string | null;
      updatedAt?: Timestamp | string | null;
      lastMessageAt?: Timestamp | string | null;
    };
    const createdAt = asIso(data.createdAt) ?? nowIso();
    return {
      id: snap.id,
      date: data.date ?? monthKey + "-01",
      title: data.title ?? "",
      channels: data.channels ?? [],
      axis: data.axis ?? undefined,
      status: normalizeStatus(data.status),
      chat: normalizeChat(data.chat),
      createdAt,
      updatedAt: asIso(data.updatedAt) ?? createdAt,
      lastMessageAt: asIso(data.lastMessageAt)
    } satisfies Post;
  });

  const events = eventsSnap.docs.map((snap) => {
    const data = snap.data() as Partial<EventItem> & {
      createdAt?: Timestamp | string | null;
      updatedAt?: Timestamp | string | null;
      lastMessageAt?: Timestamp | string | null;
    };
    const createdAt = asIso(data.createdAt) ?? nowIso();
    return {
      id: snap.id,
      date: data.date ?? monthKey + "-01",
      title: data.title ?? "",
      note: data.note ?? "",
      channels: data.channels ?? [],
      axis: data.axis ?? undefined,
      status: normalizeStatus(data.status),
      chat: normalizeChat(data.chat),
      createdAt,
      updatedAt: asIso(data.updatedAt) ?? createdAt,
      lastMessageAt: asIso(data.lastMessageAt)
    } satisfies EventItem;
  });

  const paid = paidSnap.docs.map((snap) => {
    const data = snap.data() as Partial<PaidItem> & {
      createdAt?: Timestamp | string | null;
      updatedAt?: Timestamp | string | null;
      lastMessageAt?: Timestamp | string | null;
    };
    const createdAt = asIso(data.createdAt) ?? nowIso();
    const startDate = data.startDate ?? monthKey + "-01";
    const endDate = data.endDate ?? startDate;
    return {
      id: snap.id,
      startDate,
      endDate,
      title: data.title ?? "",
      status: normalizeStatus(data.status),
      axis: data.axis ?? undefined,
      chat: normalizeChat(data.chat),
      createdAt,
      updatedAt: asIso(data.updatedAt) ?? createdAt,
      lastMessageAt: asIso(data.lastMessageAt),
      paidChannels: data.paidChannels ?? [],
      paidContent: data.paidContent ?? "",
      investmentAmount: data.investmentAmount ?? 0,
      investmentCurrency: data.investmentCurrency ?? "ARS"
    } satisfies PaidItem;
  });

  return { posts, events, paid };
}

export async function loadThreadReads(uid: string, clientId: string, monthKey: string) {
  const snap = await getDocs(
    query(
      collection(db, "users", uid, "reads"),
      where("clientId", "==", clientId),
      where("monthKey", "==", monthKey)
    )
  );
  const map: Record<string, string> = {};
  snap.forEach((docSnap) => {
    const data = docSnap.data() as { lastReadAt?: Timestamp | string | null };
    const lastReadAt = asIso(data.lastReadAt);
    if (lastReadAt) {
      map[docSnap.id] = lastReadAt;
    }
  });
  return map;
}

export async function loadDaySeen(uid: string, monthKey: string) {
  const snap = await getDocs(
    query(collection(db, "users", uid, "daySeen"), where("monthKey", "==", monthKey))
  );
  const map: Record<string, string> = {};
  snap.forEach((docSnap) => {
    const data = docSnap.data() as { lastSeenAt?: Timestamp | string | null };
    const lastSeenAt = asIso(data.lastSeenAt);
    if (lastSeenAt) {
      map[docSnap.id] = lastSeenAt;
    }
  });
  return map;
}

export async function markThreadRead(
  uid: string,
  clientId: string,
  monthKey: string,
  threadId: string,
  threadType: "post" | "event" | "paid"
) {
  await setDoc(
    doc(db, "users", uid, "reads", threadId),
    {
      clientId,
      monthKey,
      threadType,
      lastReadAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function markDaySeen(uid: string, dateKey: string) {
  const monthKey = getMonthKey(dateKey);
  await setDoc(
    doc(db, "users", uid, "daySeen", dateKey),
    {
      monthKey,
      lastSeenAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function addPost(clientId: string, date: string): Post {
  const createdAt = nowIso();
  return {
    id: makeId(),
    date,
    title: "",
    channels: [],
    status: "no_iniciado",
    chat: [],
    createdAt,
    updatedAt: createdAt,
    lastMessageAt: null
  };
}

export function addEvent(clientId: string, date: string): EventItem {
  const createdAt = nowIso();
  return {
    id: makeId(),
    date,
    title: "",
    note: "",
    channels: [],
    axis: undefined,
    status: "no_iniciado",
    chat: [],
    createdAt,
    updatedAt: createdAt,
    lastMessageAt: null
  };
}

export function addPaid(clientId: string, startDate: string, endDate?: string): PaidItem {
  const createdAt = nowIso();
  const safeEnd = endDate && endDate >= startDate ? endDate : startDate;
  return {
    id: makeId(),
    startDate,
    endDate: safeEnd,
    title: "",
    status: "no_iniciado",
    axis: undefined,
    chat: [],
    createdAt,
    updatedAt: createdAt,
    lastMessageAt: null,
    paidChannels: [],
    paidContent: "",
    investmentAmount: 0,
    investmentCurrency: "ARS"
  };
}

export function addChatMessage(text: string, author: ChatMessage["author"]): ChatMessage {
  return {
    id: makeId(),
    author,
    text,
    createdAt: nowIso()
  };
}

export async function createPostDoc(clientId: string, post: Post, userId: string) {
  const ref = doc(db, "clients", clientId, "posts", post.id);
  await setDoc(ref, {
    date: post.date,
    monthKey: getMonthKey(post.date),
    title: post.title,
    channels: post.channels,
    axis: post.axis ?? null,
    status: post.status,
    chat: post.chat,
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId
  });
}

export async function createEventDoc(clientId: string, event: EventItem, userId: string) {
  const ref = doc(db, "clients", clientId, "events", event.id);
  await setDoc(ref, {
    date: event.date,
    monthKey: getMonthKey(event.date),
    title: event.title,
    note: event.note ?? "",
    channels: event.channels,
    axis: event.axis ?? null,
    status: event.status,
    chat: event.chat,
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId
  });
}

export async function createPaidDoc(clientId: string, item: PaidItem, userId: string) {
  const ref = doc(db, "clients", clientId, "paids", item.id);
  await setDoc(ref, {
    startDate: item.startDate,
    endDate: item.endDate,
    monthKey: getMonthKey(item.startDate),
    title: item.title,
    status: item.status,
    axis: item.axis ?? null,
    chat: item.chat,
    lastMessageAt: null,
    paidChannels: item.paidChannels,
    paidContent: item.paidContent,
    investmentAmount: item.investmentAmount,
    investmentCurrency: item.investmentCurrency,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId
  });
}

export async function updateItemDoc(
  clientId: string,
  collectionName: "posts" | "events" | "paids",
  itemId: string,
  patch: Partial<Post> | Partial<EventItem> | Partial<PaidItem>
) {
  const updateData: Record<string, unknown> = {
    ...stripUndefined(patch as Record<string, unknown>),
    updatedAt: serverTimestamp()
  };
  if ("date" in patch && patch.date) {
    updateData.monthKey = getMonthKey(patch.date);
  }
  if ("startDate" in patch && patch.startDate) {
    updateData.monthKey = getMonthKey(patch.startDate);
  }
  await updateDoc(doc(db, "clients", clientId, collectionName, itemId), updateData);
}

export async function deleteItemDoc(
  clientId: string,
  collectionName: "posts" | "events" | "paids",
  itemId: string
) {
  await deleteDoc(doc(db, "clients", clientId, collectionName, itemId));
}

export async function appendItemMessage(
  clientId: string,
  collectionName: "posts" | "events" | "paids",
  itemId: string,
  message: ChatMessage,
  userId: string
) {
  await updateDoc(doc(db, "clients", clientId, collectionName, itemId), {
    chat: arrayUnion(message),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const chatRef = doc(collection(db, "clients", clientId, "chats"));
  await setDoc(chatRef, {
    threadId: itemId,
    threadType: collectionName,
    author: message.author,
    text: message.text,
    createdAt: serverTimestamp(),
    createdBy: userId
  });
}

export function ensureClientRecord<T>(record: Record<string, T[]>, clientId: string) {
  if (!record[clientId]) {
    return { ...record, [clientId]: [] };
  }
  return record;
}
