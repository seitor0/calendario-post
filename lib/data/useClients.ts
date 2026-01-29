"use client";

import {
  collection,
  doc,
  documentId,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import type { Client } from "@/lib/types";
import { normalizeClient } from "./normalize";
import { AXIS_COLORS, PAID_CHANNEL_DEFAULTS, stripUndefined } from "./helpers";
import { makeId } from "./ids";

const isDev = process.env.NODE_ENV !== "production";
let activeClientListeners = 0;

const chunkIds = (ids: string[], size = 10) => {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    batches.push(ids.slice(i, i + size));
  }
  return batches;
};

export function useClients(allowedClientIds: string[]) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientMapRef = useRef<Record<string, Client>>({});

  const idsKey = useMemo(
    () => Array.from(new Set(allowedClientIds)).sort().join("|"),
    [allowedClientIds]
  );
  const stableIds = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);

  useEffect(() => {
    if (!stableIds.length) {
      setClients([]);
      setLoading(false);
      setError(null);
      clientMapRef.current = {};
      return;
    }

    setLoading(true);
    if (isDev) {
      console.debug("[useClients] subscribe", stableIds);
    }

    const batches = chunkIds(stableIds, 10);
    const unsubscribes = batches.map((batch) => {
      const batchQuery = query(collection(db, "clients"), where(documentId(), "in", batch));
      activeClientListeners += 1;
      if (isDev) {
        console.debug("[useClients] listener+1", { active: activeClientListeners, batch });
      }
      return onSnapshot(
        batchQuery,
        (snapshot) => {
          const seen = new Set<string>();
          snapshot.docs.forEach((docSnap) => {
            seen.add(docSnap.id);
            clientMapRef.current[docSnap.id] = normalizeClient(docSnap.id, docSnap.data());
          });

          batch.forEach((clientId) => {
            if (!seen.has(clientId)) {
              delete clientMapRef.current[clientId];
            }
          });

          setClients(stableIds
            .map((id) => clientMapRef.current[id])
            .filter(Boolean));
          setLoading(false);
        },
        (err) => {
          if (isDev) {
            console.debug("[useClients] error", err);
          }
          setError(err as Error);
          setLoading(false);
        }
      );
    });

    return () => {
      if (isDev) {
        console.debug("[useClients] unsubscribe", stableIds);
      }
      unsubscribes.forEach((unsub) => {
        unsub();
        activeClientListeners = Math.max(0, activeClientListeners - 1);
        if (isDev) {
          console.debug("[useClients] listener-1", { active: activeClientListeners });
        }
      });
    };
  }, [idsKey, stableIds]);

  return { clients, loading, error };
}

export async function createClient(name: string, userId: string, enablePaid = false) {
  const clientId = makeId();
  const clientRef = doc(db, "clients", clientId);
  const newClient: Client = normalizeClient(clientId, {
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
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId
  });

  return newClient;
}

export async function updateClient(clientId: string, patch: Partial<Client>, userId?: string) {
  const updateData = stripUndefined({
    name: patch.name,
    channels: patch.channels,
    paidChannels: patch.paidChannels,
    enablePaid: patch.enablePaid,
    axes: patch.axes,
    logoDataUrl: patch.logoDataUrl
  });
  await updateDoc(doc(db, "clients", clientId), {
    ...updateData,
    updatedAt: serverTimestamp(),
    ...(userId ? { updatedBy: userId } : {})
  });
}
