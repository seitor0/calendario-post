"use client";

import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { getMonthKey } from "@/lib/date";

const isDev = process.env.NODE_ENV !== "production";

type ReadMap = Record<string, string>;

type LoadState = {
  data: ReadMap;
  loading: boolean;
  error: Error | null;
};

export function useThreadReads(uid?: string | null, clientId?: string | null, monthKey?: string | null) {
  const [state, setState] = useState<LoadState>({ data: {}, loading: false, error: null });
  useEffect(() => {
    if (!uid || !clientId || !monthKey) {
      setState({ data: {}, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    if (isDev) {
      console.debug("[useThreadReads] subscribe", { uid, clientId, monthKey });
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, "users", uid, "reads"),
        where("clientId", "==", clientId),
        where("monthKey", "==", monthKey)
      ),
      (snapshot) => {
        const map: ReadMap = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { lastReadAt?: string };
          if (data.lastReadAt) {
            map[docSnap.id] = data.lastReadAt;
          }
        });
        setState({ data: map, loading: false, error: null });
      },
      (err) => {
        if (isDev) {
          console.debug("[useThreadReads] error", err);
        }
        setState({ data: {}, loading: false, error: err as Error });
      }
    );

    return () => {
      if (isDev) {
        console.debug("[useThreadReads] unsubscribe", { uid, clientId, monthKey });
      }
      unsubscribe();
    };
  }, [uid, clientId, monthKey]);

  return state;
}

export function useDaySeen(uid?: string | null, monthKey?: string | null) {
  const [state, setState] = useState<LoadState>({ data: {}, loading: false, error: null });
  useEffect(() => {
    if (!uid || !monthKey) {
      setState({ data: {}, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    if (isDev) {
      console.debug("[useDaySeen] subscribe", { uid, monthKey });
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "users", uid, "daySeen"), where("monthKey", "==", monthKey)),
      (snapshot) => {
        const map: ReadMap = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { lastSeenAt?: string };
          if (data.lastSeenAt) {
            map[docSnap.id] = data.lastSeenAt;
          }
        });
        setState({ data: map, loading: false, error: null });
      },
      (err) => {
        if (isDev) {
          console.debug("[useDaySeen] error", err);
        }
        setState({ data: {}, loading: false, error: err as Error });
      }
    );

    return () => {
      if (isDev) {
        console.debug("[useDaySeen] unsubscribe", { uid, monthKey });
      }
      unsubscribe();
    };
  }, [uid, monthKey]);

  return state;
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
