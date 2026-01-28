"use client";

import { addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApprovalUser, Post, PostStatus, SyncStatus } from "@/lib/types";
import { postsCollection, postsQuery } from "@/lib/data/firestoreRefs";
import { deriveSyncStatus } from "@/lib/data/syncStatus";
import { normalizePost } from "@/lib/data/normalize";
import { stripUndefined } from "@/lib/data/helpers";
import { getMonthKey } from "@/lib/date";
import { useOnlineStatus } from "@/lib/data/useOnlineStatus";

export type CreatePostInput = {
  date: string;
  title?: string;
  channels?: string[];
  axis?: string;
  status?: PostStatus;
  brief?: Post["brief"];
  copyOut?: Post["copyOut"];
  pieceLink?: Post["pieceLink"];
};

const isDev = process.env.NODE_ENV !== "production";

export function usePosts(clientId?: string | null) {
  const [data, setData] = useState<Post[]>([]);
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
      console.debug("[usePosts] subscribe", clientId);
    }

    const unsubscribe = onSnapshot(
      postsQuery(clientId),
      (snapshot) => {
        setData(snapshot.docs.map((docSnap) => normalizePost(docSnap.id, docSnap.data())));
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (isDev) {
          console.debug("[usePosts] error", err);
        }
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      if (isDev) {
        console.debug("[usePosts] unsubscribe", clientId);
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
      console.debug("[usePosts] pendingWrites", hasPendingWrites);
    }
  }, [hasPendingWrites]);

  const syncStatus: SyncStatus = useMemo(
    () => deriveSyncStatus(online, hasPendingWrites, error),
    [online, hasPendingWrites, error]
  );

  const createPost = useCallback(
    async (input: CreatePostInput, user?: ApprovalUser) => {
      if (!clientId || !user) {
        return null;
      }
      const ref = await addDoc(postsCollection(clientId), {
        date: input.date,
        monthKey: getMonthKey(input.date),
        title: input.title ?? "",
        channels: input.channels ?? [],
        axis: input.axis ?? null,
        status: input.status ?? "no_iniciado",
        brief: input.brief ?? {
          text: "",
          approved: false,
          approvedAt: null,
          approvedBy: null,
          updatedAt: null,
          updatedBy: null
        },
        copyOut: input.copyOut ?? {
          text: "",
          approved: false,
          approvedAt: null,
          approvedBy: null,
          updatedAt: null,
          updatedBy: null
        },
        pieceLink: input.pieceLink ?? {
          url: "",
          approved: false,
          approvedAt: null,
          approvedBy: null,
          updatedAt: null,
          updatedBy: null
        },
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

  const updatePost = useCallback(
    async (postId: string, patch: Partial<Post>, user?: ApprovalUser) => {
      if (!clientId) {
        return;
      }
      const updateData: Record<string, any> = stripUndefined({ ...patch });
      delete (updateData as Partial<Post>).createdAt;
      delete (updateData as Partial<Post>).updatedAt;
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
      await updateDoc(doc(postsCollection(clientId), postId), updateData);
    },
    [clientId]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!clientId) {
        return;
      }
      await deleteDoc(doc(postsCollection(clientId), postId));
    },
    [clientId]
  );

  return {
    data,
    loading,
    error,
    syncStatus,
    createPost,
    updatePost,
    deletePost
  };
}
