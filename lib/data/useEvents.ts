"use client";

import { addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApprovalUser, EventItem, PostStatus, SyncStatus } from "@/lib/types";
import { eventsCollection, eventsQuery } from "@/lib/data/firestoreRefs";
import { deriveSyncStatus } from "@/lib/data/syncStatus";
import { normalizeEvent } from "@/lib/data/normalize";
import { stripUndefined } from "@/lib/data/helpers";
import { getMonthKey } from "@/lib/date";
import { useOnlineStatus } from "@/lib/data/useOnlineStatus";

export type CreateEventInput = {
  date: string;
  title?: string;
  note?: string;
  channels?: string[];
  axis?: string;
  status?: PostStatus;
};

const isDev = process.env.NODE_ENV !== "production";

export function useEvents(clientId?: string | null) {
  const [data, setData] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const online = useOnlineStatus();
  const pendingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!clientId) {
      setData([]);
      setLoading(false);
      setError(null);
      setHasPendingWrites(false);
      return;
    }

    setLoading(true);
    if (isDev) {
      console.debug("[useEvents] subscribe", clientId);
    }

    const unsubscribe = onSnapshot(
      eventsQuery(clientId),
      (snapshot) => {
        setData(snapshot.docs.map((docSnap) => normalizeEvent(docSnap.id, docSnap.data())));
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (isDev) {
          console.debug("[useEvents] error", err);
        }
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      if (isDev) {
        console.debug("[useEvents] unsubscribe", clientId);
      }
      unsubscribe();
    };
  }, [clientId]);

  useEffect(() => {
    if (pendingRef.current === hasPendingWrites) {
      return;
    }
    pendingRef.current = hasPendingWrites;
    if (isDev) {
      console.debug("[useEvents] pendingWrites", hasPendingWrites);
    }
  }, [hasPendingWrites]);

  const syncStatus: SyncStatus = useMemo(
    () => deriveSyncStatus(online, hasPendingWrites, error),
    [online, hasPendingWrites, error]
  );

  const createEvent = useCallback(
    async (input: CreateEventInput, user?: ApprovalUser) => {
      if (!clientId || !user) {
        return null;
      }
      const ref = await addDoc(eventsCollection(clientId), {
        date: input.date,
        monthKey: getMonthKey(input.date),
        title: input.title ?? "",
        note: input.note ?? "",
        channels: input.channels ?? [],
        axis: input.axis ?? null,
        status: input.status ?? "no_iniciado",
        internalComment: "",
        lastMessageAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid
      });
      return ref.id;
    },
    [clientId]
  );

  const updateEvent = useCallback(
    async (eventId: string, patch: Partial<EventItem>, user?: ApprovalUser) => {
      if (!clientId) {
        return;
      }
      const updateData: Record<string, any> = stripUndefined({ ...patch });
      delete (updateData as Partial<EventItem>).createdAt;
      delete (updateData as Partial<EventItem>).updatedAt;
      if ("axis" in updateData && updateData.axis === "") {
        updateData.axis = null;
      }
      if (patch.date) {
        updateData.monthKey = getMonthKey(patch.date);
      }
      if (user?.uid) {
        updateData.updatedBy = user.uid;
      }
      updateData.updatedAt = serverTimestamp();
      await updateDoc(doc(eventsCollection(clientId), eventId), updateData);
    },
    [clientId]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!clientId) {
        return;
      }
      await deleteDoc(doc(eventsCollection(clientId), eventId));
    },
    [clientId]
  );

  return {
    data,
    loading,
    error,
    syncStatus,
    createEvent,
    updateEvent,
    deleteEvent
  };
}
