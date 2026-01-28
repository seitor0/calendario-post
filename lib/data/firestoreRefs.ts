import { collection, doc, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const usersCollection = () => collection(db, "users");
export const userDoc = (uid: string) => doc(db, "users", uid);

export const clientsCollection = () => collection(db, "clients");
export const clientDoc = (clientId: string) => doc(db, "clients", clientId);

export const postsCollection = (clientId: string) =>
  collection(db, "clients", clientId, "posts");
export const eventsCollection = (clientId: string) =>
  collection(db, "clients", clientId, "events");
export const paidsCollection = (clientId: string) =>
  collection(db, "clients", clientId, "paids");

export const chatsCollection = (clientId: string) =>
  collection(db, "clients", clientId, "chats");
export const chatDoc = (clientId: string, chatId: string) =>
  doc(db, "clients", clientId, "chats", chatId);
export const messagesCollection = (clientId: string, chatId: string) =>
  collection(db, "clients", clientId, "chats", chatId, "messages");

export const postsQuery = (clientId: string) =>
  query(postsCollection(clientId), orderBy("date", "asc"));
export const eventsQuery = (clientId: string) =>
  query(eventsCollection(clientId), orderBy("date", "asc"));
export const paidsQuery = (clientId: string) =>
  query(paidsCollection(clientId), orderBy("startDate", "asc"));
export const messagesQuery = (clientId: string, chatId: string) =>
  query(messagesCollection(clientId, chatId), orderBy("createdAt", "asc"), limit(300));
