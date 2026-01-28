"use client";

import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import type { Client } from "@/lib/types";
import { normalizeClient } from "@/lib/data/normalize";
import { AXIS_COLORS, PAID_CHANNEL_DEFAULTS, stripUndefined } from "@/lib/data/helpers";
import { makeId } from "@/lib/data/ids";

const isDev = process.env.NODE_ENV !== "production";

export function useClients(allowedClientIds: string[]) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientMapRef = useRef<Record<string, Client>>({});

  const idsKey = useMemo(() => allowedClientIds.join("|"), [allowedClientIds]);

  useEffect(() => {
    if (!allowedClientIds.length) {
      setClients([]);
      setLoading(false);
      setError(null);
      clientMapRef.current = {};
      return;
    }

    setLoading(true);
    if (isDev) {
      console.debug("[useClients] subscribe", allowedClientIds);
    }

    const unsubscribes = allowedClientIds.map((clientId) =>
      onSnapshot(
        doc(db, "clients", clientId),
        (snapshot) => {
          if (!snapshot.exists()) {
            delete clientMapRef.current[clientId];
          } else {
            clientMapRef.current[clientId] = normalizeClient(snapshot.id, snapshot.data());
          }
          setClients(allowedClientIds
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
      )
    );

    return () => {
      if (isDev) {
        console.debug("[useClients] unsubscribe", allowedClientIds);
      }
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [idsKey, allowedClientIds]);

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
