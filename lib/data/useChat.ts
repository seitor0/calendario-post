"use client";

import { addDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApprovalUser, ChatMessage, SyncStatus } from "@/lib/types";
import { messagesCollection, messagesQuery, postsCollection, eventsCollection, paidsCollection } from "@/lib/data/firestoreRefs";
import { deriveSyncStatus } from "@/lib/data/syncStatus";
import { normalizeChatMessage } from "@/lib/data/normalize";
import { parseChatId, stripUndefined } from "@/lib/data/helpers";
import { useOnlineStatus } from "@/lib/data/useOnlineStatus";

const isDev = process.env.NODE_ENV !== "production";

export function useChat(clientId?: string | null, chatId?: string | null) {
  const [data, setData] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const online = useOnlineStatus();
  const pendingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!clientId || !chatId) {
      setData([]);
      setLoading(false);
      setError(null);
      setHasPendingWrites(false);
      return;
    }

    setLoading(true);
    if (isDev) {
      console.debug("[useChat] subscribe", { clientId, chatId });
    }

    const unsubscribe = onSnapshot(
      messagesQuery(clientId, chatId),
      (snapshot) => {
        setData(snapshot.docs.map((docSnap) => normalizeChatMessage(docSnap.id, docSnap.data())));
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (isDev) {
          console.debug("[useChat] error", err);
        }
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      if (isDev) {
        console.debug("[useChat] unsubscribe", { clientId, chatId });
      }
      unsubscribe();
    };
  }, [clientId, chatId]);

  useEffect(() => {
    if (pendingRef.current === hasPendingWrites) {
      return;
    }
    pendingRef.current = hasPendingWrites;
    if (isDev) {
      console.debug("[useChat] pendingWrites", hasPendingWrites);
    }
  }, [hasPendingWrites]);

  const syncStatus: SyncStatus = useMemo(
    () => deriveSyncStatus(online, hasPendingWrites, error),
    [online, hasPendingWrites, error]
  );

  const sendMessage = useCallback(
    async (text: string, user?: ApprovalUser) => {
      if (!clientId || !chatId || !user) {
        return;
      }
      const payload = stripUndefined({
        text,
        uid: user.uid,
        displayName: user.name,
        email: user.email,
        createdAt: serverTimestamp()
      });
      await addDoc(messagesCollection(clientId, chatId), payload);

      const { threadType, threadId } = parseChatId(chatId);
      if (threadType && threadId) {
        const parentCollection =
          threadType === "posts"
            ? postsCollection(clientId)
            : threadType === "events"
              ? eventsCollection(clientId)
              : paidsCollection(clientId);
        await updateDoc(doc(parentCollection, threadId), {
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });
      }
    },
    [clientId, chatId]
  );

  return {
    data,
    loading,
    error,
    syncStatus,
    sendMessage
  };
}
