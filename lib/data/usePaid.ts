"use client";

import { addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApprovalUser, PaidItem, PostStatus, SyncStatus } from "@/lib/types";
import { paidsCollection, paidsQuery } from "@/lib/data/firestoreRefs";
import { deriveSyncStatus } from "@/lib/data/syncStatus";
import { normalizePaid } from "@/lib/data/normalize";
import { stripUndefined } from "@/lib/data/helpers";
import { getMonthKey } from "@/lib/date";
import { useOnlineStatus } from "@/lib/data/useOnlineStatus";

export type CreatePaidInput = {
  startDate: string;
  endDate: string;
  title?: string;
  status?: PostStatus;
  axis?: string;
  paidChannels?: string[];
  paidContent?: string;
  investmentAmount?: number;
  investmentCurrency?: "ARS" | "USD";
};

const isDev = process.env.NODE_ENV !== "production";

export function usePaid(clientId?: string | null) {
  const [data, setData] = useState<PaidItem[]>([]);
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
      console.debug("[usePaid] subscribe", clientId);
    }

    const unsubscribe = onSnapshot(
      paidsQuery(clientId),
      (snapshot) => {
        setData(snapshot.docs.map((docSnap) => normalizePaid(docSnap.id, docSnap.data())));
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (isDev) {
          console.debug("[usePaid] error", err);
        }
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      if (isDev) {
        console.debug("[usePaid] unsubscribe", clientId);
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
      console.debug("[usePaid] pendingWrites", hasPendingWrites);
    }
  }, [hasPendingWrites]);

  const syncStatus: SyncStatus = useMemo(
    () => deriveSyncStatus(online, hasPendingWrites, error),
    [online, hasPendingWrites, error]
  );

  const createPaid = useCallback(
    async (input: CreatePaidInput, user?: ApprovalUser) => {
      if (!clientId || !user) {
        return null;
      }
      const safeEnd = input.endDate && input.endDate >= input.startDate ? input.endDate : input.startDate;
      const ref = await addDoc(paidsCollection(clientId), {
        startDate: input.startDate,
        endDate: safeEnd,
        monthKey: getMonthKey(input.startDate),
        title: input.title ?? "",
        status: input.status ?? "no_iniciado",
        axis: input.axis ?? null,
        lastMessageAt: null,
        paidChannels: input.paidChannels ?? [],
        paidContent: input.paidContent ?? "",
        investmentAmount: input.investmentAmount ?? 0,
        investmentCurrency: input.investmentCurrency ?? "ARS",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid
      });
      return ref.id;
    },
    [clientId]
  );

  const updatePaid = useCallback(
    async (paidId: string, patch: Partial<PaidItem>, user?: ApprovalUser) => {
      if (!clientId) {
        return;
      }
      const updateData: Record<string, any> = stripUndefined({ ...patch });
      delete (updateData as Partial<PaidItem>).createdAt;
      delete (updateData as Partial<PaidItem>).updatedAt;
      if ("axis" in updateData && updateData.axis === "") {
        updateData.axis = null;
      }
      if (patch.startDate) {
        updateData.monthKey = getMonthKey(patch.startDate);
      }
      if (patch.endDate && patch.startDate && patch.endDate < patch.startDate) {
        updateData.endDate = patch.startDate;
      }
      if (user?.uid) {
        updateData.updatedBy = user.uid;
      }
      updateData.updatedAt = serverTimestamp();
      await updateDoc(doc(paidsCollection(clientId), paidId), updateData);
    },
    [clientId]
  );

  const deletePaid = useCallback(
    async (paidId: string) => {
      if (!clientId) {
        return;
      }
      await deleteDoc(doc(paidsCollection(clientId), paidId));
    },
    [clientId]
  );

  return {
    data,
    loading,
    error,
    syncStatus,
    createPaid,
    updatePaid,
    deletePaid
  };
}
