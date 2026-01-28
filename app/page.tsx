"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, limit, query } from "firebase/firestore";
import CalendarMonth from "@/components/CalendarMonth";
import AddItemModal, {
  AddEventPayload,
  AddPaidPayload,
  AddPostPayload
} from "@/components/AddItemModal";
import FooterSummary from "@/components/FooterSummary";
import Header from "@/components/Header";
import RightPanel from "@/components/RightPanel";
import SettingsModal from "@/components/SettingsModal";
import {
  addChatMessage,
  addEvent,
  addPaid,
  addPost,
  clearLegacyLocalData,
  createClient,
  createEventDoc,
  createPaidDoc,
  createPostDoc,
  deleteItemDoc,
  ensureClientRecord,
  getMonthKey,
  getPreferredClientId,
  loadClientMonthData,
  loadDaySeen,
  loadThreadReads,
  markDaySeen,
  markThreadRead,
  setPreferredClientId,
  updateClient,
  updateItemDoc,
  appendItemMessage,
  DATA_VERSION,
  fetchClientsForProfile
} from "@/lib/storage";
import { isDateInRange, toISODate } from "@/lib/date";
import type { AppData, ApprovalUser, Client, EventItem, PaidItem, Post, UserProfile } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { loginWithGoogle, logout } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { logAuthState, safeGetDoc, safeGetDocs } from "@/lib/debugFirestore";

const EMPTY_MAP: Record<string, boolean> = {};

type SelectedItem = {
  type: "post" | "event" | "paid";
  id: string;
} | null;

type DebugResult = { ok: boolean; message: string };

type DebugPanelProps = {
  enabled: boolean;
  authUser: User | null;
  profile: UserProfile | null;
  activeClientId: string;
  monthKey: string;
  selectedDate: string;
};

const formatDebugError = (error: unknown) => {
  if (error && typeof error === "object") {
    const err = error as { code?: string; message?: string };
    const code = err.code ? String(err.code) : "unknown";
    const message = err.message ? String(err.message) : "Unknown error";
    return `${code}: ${message}`;
  }
  return String(error);
};

function DebugPanel({
  enabled,
  authUser,
  profile,
  activeClientId,
  monthKey,
  selectedDate
}: DebugPanelProps) {
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ok" | "missing" | "error">("idle");
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [testResults, setTestResults] = useState<Record<string, DebugResult>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!enabled || !authUser) {
      setProfileStatus("idle");
      setProfileData(null);
      return;
    }
    let active = true;
    setProfileStatus("loading");
    void safeGetDoc(doc(db, "users", authUser.uid), `users/${authUser.uid}`)
      .then((snap) => {
        if (!active) {
          return;
        }
        if (!snap.exists()) {
          setProfileStatus("missing");
          setProfileData(null);
          return;
        }
        setProfileStatus("ok");
        setProfileData(snap.data() as Record<string, unknown>);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setProfileStatus("error");
        setProfileData({ error: formatDebugError(error) });
      });
    return () => {
      active = false;
    };
  }, [enabled, authUser?.uid]);

  if (!enabled) {
    return null;
  }

  const runPermissionTests = async () => {
    if (!authUser || !activeClientId) {
      setTestResults({
        guard: {
          ok: false,
          message: "Missing authUser or activeClientId"
        }
      });
      return;
    }

    setTesting(true);
    const results: Record<string, DebugResult> = {};

    try {
      await safeGetDoc(doc(db, "clients", activeClientId), `clients/${activeClientId}`);
      results.clientDoc = { ok: true, message: "OK" };
    } catch (error) {
      results.clientDoc = { ok: false, message: formatDebugError(error) };
    }

    try {
      await safeGetDocs(
        query(collection(db, "clients", activeClientId, "posts"), limit(1)),
        `clients/${activeClientId}/posts?limit=1`
      );
      results.posts = { ok: true, message: "OK" };
    } catch (error) {
      results.posts = { ok: false, message: formatDebugError(error) };
    }

    try {
      await safeGetDocs(
        query(collection(db, "clients", activeClientId, "events"), limit(1)),
        `clients/${activeClientId}/events?limit=1`
      );
      results.events = { ok: true, message: "OK" };
    } catch (error) {
      results.events = { ok: false, message: formatDebugError(error) };
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="rounded-2xl bg-white/70 p-4 text-xs text-ink/80 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Debug Panel</div>
        <div className="text-[10px] uppercase tracking-wide text-ink/50">debug</div>
      </div>
      <div className="mt-3 grid gap-2">
        <div><span className="font-semibold">Auth:</span> {authUser ? `${authUser.uid} (${authUser.email ?? "no-email"})` : "none"}</div>
        <div><span className="font-semibold">activeClientId:</span> {activeClientId || "(empty)"}</div>
        <div><span className="font-semibold">monthKey:</span> {monthKey}</div>
        <div><span className="font-semibold">selectedDate:</span> {selectedDate}</div>
        <div><span className="font-semibold">profile.roles:</span> {profile ? JSON.stringify(profile.roles ?? {}) : "null"}</div>
        <div><span className="font-semibold">profile.allowedClients:</span> {profile ? JSON.stringify(profile.allowedClients ?? []) : "null"}</div>
        <div><span className="font-semibold">/users/{authUser?.uid}:</span> {profileStatus}</div>
        {profileData ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-ink/5 p-2 text-[11px] text-ink/70">
            {JSON.stringify(profileData, null, 2)}
          </pre>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runPermissionTests}
          disabled={testing}
          className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink transition hover:-translate-y-0.5 hover:shadow-soft disabled:opacity-60"
        >
          {testing ? "Testing..." : "Test permissions"}
        </button>
        {Object.keys(testResults).length > 0 ? (
          <div className="text-[11px] text-ink/60">Results:</div>
        ) : null}
        {Object.entries(testResults).map(([key, result]) => (
          <div key={key} className="text-[11px]">
            <span className={result.ok ? "text-emerald-600" : "text-rose-600"}>
              {key}: {result.ok ? "OK" : "ERROR"}
            </span>
            {!result.ok ? ` (${result.message})` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function stripTimestampPatch<T extends { updatedAt?: string; createdAt?: string }>(patch: T) {
  const { updatedAt, createdAt, ...rest } = patch;
  return rest;
}

export default function HomePage() {
  const { authUser, profile, loading, isAdmin } = useCurrentUser();
  const [data, setData] = useState<AppData | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"post" | "event" | "paid">("post");
  const [readsById, setReadsById] = useState<Record<string, string>>({});
  const [daySeen, setDaySeen] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);
  const clearedLegacyRef = useRef(false);
  const userMeta: ApprovalUser | null = authUser
    ? {
        uid: authUser.uid,
        ...(authUser.displayName ? { name: authUser.displayName } : {}),
        ...(authUser.email ? { email: authUser.email } : {})
      }
    : null;
  const [debugEnabled, setDebugEnabled] = useState(
    () => process.env.NEXT_PUBLIC_DEBUG === "true"
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.search.includes("debug=1")) {
      setDebugEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!authUser) {
      setData(null);
      return;
    }
    if (!profile) {
      setData(null);
      return;
    }

    let isActive = true;
    const boot = async () => {
      if (!clearedLegacyRef.current) {
        clearLegacyLocalData();
        clearedLegacyRef.current = true;
      }
      const clients = await fetchClientsForProfile(profile);
      if (!isActive) {
        return;
      }
      const preferred = getPreferredClientId();
      const allowedIds = clients.map((client) => client.id);
      const nextActive =
        preferred && allowedIds.includes(preferred) ? preferred : allowedIds[0] ?? "";

      setData({
        version: DATA_VERSION,
        activeClientId: nextActive,
        clients,
        postsByClient: {},
        eventsByClient: {},
        paidByClient: {}
      });
    };

    void boot();

    return () => {
      isActive = false;
    };
  }, [loading, authUser, profile]);

  const activeClient = data?.clients.find((client) => client.id === data.activeClientId) ?? null;
  const posts = activeClient ? data?.postsByClient[activeClient.id] ?? [] : [];
  const events = activeClient ? data?.eventsByClient[activeClient.id] ?? [] : [];
  const paid = activeClient && activeClient.enablePaid
    ? data?.paidByClient[activeClient.id] ?? []
    : [];
  const allowedClientsKey = profile?.allowedClients.join("|") ?? "";

  const monthKey = useMemo(
    () => getMonthKey(toISODate(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1))),
    [viewDate]
  );

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }
    logAuthState("calendar");
    console.groupCollapsed("[Debug] calendar context");
    console.log("activeClientId", data?.activeClientId ?? "");
    console.log("monthKey", monthKey);
    console.log("selectedDate", selectedDate);
    console.log("allowedClients", profile?.allowedClients ?? []);
    console.groupEnd();
  }, [debugEnabled, data?.activeClientId, monthKey, selectedDate, allowedClientsKey, profile]);

  useEffect(() => {
    if (!authUser || !profile || !data?.activeClientId) {
      return;
    }
    if (!profile.allowedClients.includes(data.activeClientId)) {
      return;
    }
    let isActive = true;
    const load = async () => {
      setLoadingData(true);
      const { posts, events, paid } = await loadClientMonthData(data.activeClientId, monthKey);
      const [reads, seen] = await Promise.all([
        loadThreadReads(authUser.uid, data.activeClientId, monthKey),
        loadDaySeen(authUser.uid, monthKey)
      ]);
      if (!isActive) {
        return;
      }
      setData((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          postsByClient: { ...prev.postsByClient, [data.activeClientId]: posts },
          eventsByClient: { ...prev.eventsByClient, [data.activeClientId]: events },
          paidByClient: { ...prev.paidByClient, [data.activeClientId]: paid }
        };
      });
      setReadsById(reads);
      setDaySeen(seen);
      setLoadingData(false);
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [authUser, profile, data?.activeClientId, monthKey]);

  useEffect(() => {
    if (!data?.activeClientId) {
      return;
    }
    setPreferredClientId(data.activeClientId);
    setSelectedItem(null);
  }, [data?.activeClientId]);

  useEffect(() => {
    if (!profile || !data) {
      return;
    }
    if (profile.allowedClients.length === 0) {
      if (data.activeClientId) {
        setData((prev) => (prev ? { ...prev, activeClientId: "" } : prev));
      }
      return;
    }
    if (!profile.allowedClients.includes(data.activeClientId)) {
      const nextActive = profile.allowedClients[0];
      setData((prev) => (prev ? { ...prev, activeClientId: nextActive } : prev));
      setPreferredClientId(nextActive);
    }
  }, [profile, data?.activeClientId, allowedClientsKey]);

  const selectedDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    if (!year || !month || !day) {
      return new Date();
    }
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  const postsForDay = useMemo(
    () => posts.filter((post) => post.date === selectedDate),
    [posts, selectedDate]
  );

  const eventsForDay = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate]
  );

  const paidForDay = useMemo(
    () =>
      paid.filter((item) =>
        isDateInRange(selectedDate, item.startDate, item.endDate)
      ),
    [paid, selectedDate]
  );

  const unreadById = useMemo(() => {
    const map: Record<string, boolean> = {};
    const check = (item: Post | EventItem | PaidItem) => {
      if (!item.lastMessageAt) {
        return;
      }
      const lastRead = readsById[item.id];
      if (!lastRead || item.lastMessageAt > lastRead) {
        map[item.id] = true;
      }
    };
    posts.forEach(check);
    events.forEach(check);
    paid.forEach(check);
    return map;
  }, [posts, events, paid, readsById]);

  const dayUpdates = useMemo(() => {
    const map: Record<string, boolean> = {};
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

    const mark = (dateKey: string, updatedAt?: string) => {
      if (!updatedAt) {
        return;
      }
      const lastSeen = daySeen[dateKey];
      if (!lastSeen || updatedAt > lastSeen) {
        map[dateKey] = true;
      }
    };

    posts.forEach((post) => mark(post.date, post.updatedAt));
    events.forEach((event) => mark(event.date, event.updatedAt));
    paid.forEach((item) => {
      const start = new Date(`${item.startDate}T00:00:00`);
      const end = new Date(
        `${(item.endDate && item.endDate >= item.startDate ? item.endDate : item.startDate)}T00:00:00`
      );
      const current = new Date(start);
      while (current <= end) {
        if (current >= monthStart && current <= monthEnd) {
          mark(toISODate(current), item.updatedAt);
        }
        current.setDate(current.getDate() + 1);
      }
    });

    return map;
  }, [posts, events, paid, daySeen, viewDate]);

  useEffect(() => {
    if (!authUser || !profile || !activeClient || !selectedItem) {
      return;
    }
    if (!profile.allowedClients.includes(activeClient.id)) {
      return;
    }
    const collection = selectedItem.type === "post" ? posts : selectedItem.type === "event" ? events : paid;
    const item = collection.find((entry) => entry.id === selectedItem.id);
    if (!item) {
      return;
    }
    const dateKey = "date" in item ? item.date : item.startDate;
    const itemMonthKey = getMonthKey(dateKey);
    void markThreadRead(authUser.uid, activeClient.id, itemMonthKey, item.id, selectedItem.type).then(() => {
      setReadsById((prev) => ({ ...prev, [item.id]: new Date().toISOString() }));
    });
  }, [authUser, profile, activeClient, selectedItem, posts, events, paid]);

  useEffect(() => {
    if (!authUser || !profile || !activeClient) {
      return;
    }
    if (!profile.allowedClients.includes(activeClient.id)) {
      return;
    }
    void markDaySeen(authUser.uid, selectedDate).then(() => {
      setDaySeen((prev) => ({ ...prev, [selectedDate]: new Date().toISOString() }));
    });
  }, [authUser, profile, activeClient, selectedDate]);

  useEffect(() => {
    const hasSelectedPost =
      selectedItem?.type === "post" &&
      postsForDay.some((post) => post.id === selectedItem.id);
    const hasSelectedEvent =
      selectedItem?.type === "event" &&
      eventsForDay.some((event) => event.id === selectedItem.id);
    const hasSelectedPaid =
      selectedItem?.type === "paid" &&
      paidForDay.some((item) => item.id === selectedItem.id);

    if (hasSelectedPost || hasSelectedEvent || hasSelectedPaid) {
      return;
    }

    if (postsForDay.length > 0) {
      setSelectedItem({ type: "post", id: postsForDay[0].id });
      return;
    }

    if (activeClient?.enablePaid && paidForDay.length > 0) {
      setSelectedItem({ type: "paid", id: paidForDay[0].id });
      return;
    }

    if (eventsForDay.length > 0) {
      setSelectedItem({ type: "event", id: eventsForDay[0].id });
      return;
    }

    setSelectedItem(null);
  }, [postsForDay, eventsForDay, paidForDay, selectedItem, activeClient?.enablePaid]);

  const handleMonthChange = (date: Date) => {
    setViewDate(date);
    const selected = new Date(`${selectedDate}T00:00:00`);
    if (selected.getMonth() !== date.getMonth() || selected.getFullYear() !== date.getFullYear()) {
      setSelectedDate(toISODate(date));
    }
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
  };

  const handleSelectClient = (clientId: string) => {
    if (!profile || !profile.allowedClients.includes(clientId)) {
      return;
    }
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, activeClientId: clientId };
    });
    setPreferredClientId(clientId);
    setSelectedItem(null);
  };

  const handleCreateClient = async (name: string, enablePaid = false) => {
    if (!authUser || !profile || !isAdmin) {
      return;
    }
    const newClient = await createClient(name, authUser, enablePaid);
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        clients: [...prev.clients, newClient],
        activeClientId: newClient.id
      };
    });
    setPreferredClientId(newClient.id);
  };

  const handleUpdateClient = async (clientId: string, patch: Partial<Client>) => {
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        clients: prev.clients.map((client) =>
          client.id === clientId ? { ...client, ...patch } : client
        )
      };
    });
    if (isAdmin) {
      await updateClient(clientId, patch);
    }
  };

  const handleAddPost = async (payload: AddPostPayload) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const newPost = addPost(activeClient.id, payload.date);
    newPost.title = payload.title;
    newPost.channels = payload.channels;
    newPost.axis = payload.axis;
    newPost.updatedAt = new Date().toISOString();
    newPost.createdAt = newPost.updatedAt;
    setSelectedItem({ type: "post", id: newPost.id });
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPostsByClient = ensureClientRecord(prev.postsByClient, activeClient.id);
      return {
        ...prev,
        postsByClient: {
          ...nextPostsByClient,
          [activeClient.id]: [...(nextPostsByClient[activeClient.id] ?? []), newPost]
        }
      };
    });
    await createPostDoc(activeClient.id, newPost, userMeta);
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setAddModalOpen(false);
  };

  const handleAddEvent = async (payload: AddEventPayload) => {
    if (!activeClient || !authUser) {
      return;
    }
    const newEvent = addEvent(activeClient.id, payload.date);
    newEvent.title = payload.title;
    newEvent.note = payload.note;
    newEvent.channels = payload.channels ?? [];
    newEvent.axis = payload.axis;
    newEvent.status = newEvent.status ?? "no_iniciado";
    newEvent.chat = newEvent.chat ?? [];
    newEvent.updatedAt = new Date().toISOString();
    newEvent.createdAt = newEvent.updatedAt;
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextEventsByClient = ensureClientRecord(prev.eventsByClient, activeClient.id);
      return {
        ...prev,
        eventsByClient: {
          ...nextEventsByClient,
          [activeClient.id]: [...(nextEventsByClient[activeClient.id] ?? []), newEvent]
        }
      };
    });
    await createEventDoc(activeClient.id, newEvent, authUser.uid);
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setSelectedItem({ type: "event", id: newEvent.id });
    setAddModalOpen(false);
  };

  const handleAddPaid = async (payload: AddPaidPayload) => {
    if (!activeClient || !authUser) {
      return;
    }
    const newItem = addPaid(activeClient.id, payload.startDate, payload.endDate);
    newItem.title = payload.title;
    newItem.paidChannels = payload.paidChannels;
    newItem.paidContent = payload.paidContent;
    newItem.investmentAmount = payload.investmentAmount;
    newItem.investmentCurrency = payload.investmentCurrency;
    newItem.axis = payload.axis;
    newItem.updatedAt = new Date().toISOString();
    newItem.createdAt = newItem.updatedAt;
    setSelectedItem({ type: "paid", id: newItem.id });
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPaidByClient = ensureClientRecord(prev.paidByClient, activeClient.id);
      return {
        ...prev,
        paidByClient: {
          ...nextPaidByClient,
          [activeClient.id]: [...(nextPaidByClient[activeClient.id] ?? []), newItem]
        }
      };
    });
    await createPaidDoc(activeClient.id, newItem, authUser.uid);
    setSelectedDate(payload.startDate);
    setViewDate(new Date(`${payload.startDate}T00:00:00`));
    setAddModalOpen(false);
  };

  const updatePost = async (
    postId: string,
    patch: Partial<Post>,
    firestorePatch?: Record<string, any>
  ) => {
    if (!activeClient || !authUser) {
      return;
    }
    const updatedAt = new Date().toISOString();
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPosts = (prev.postsByClient[activeClient.id] ?? []).map((post) =>
        post.id === postId ? { ...post, ...patch, updatedAt } : post
      );
      return {
        ...prev,
        postsByClient: { ...prev.postsByClient, [activeClient.id]: nextPosts }
      };
    });
    await updateItemDoc(
      activeClient.id,
      "posts",
      postId,
      firestorePatch ?? stripTimestampPatch(patch)
    );
  };

  const deletePost = async (postId: string) => {
    if (!activeClient || !authUser) {
      return;
    }
    if (selectedItem?.type === "post" && selectedItem.id === postId) {
      setSelectedItem(null);
    }
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPosts = (prev.postsByClient[activeClient.id] ?? []).filter(
        (post) => post.id !== postId
      );
      return {
        ...prev,
        postsByClient: { ...prev.postsByClient, [activeClient.id]: nextPosts }
      };
    });
    await deleteItemDoc(activeClient.id, "posts", postId);
  };

  const duplicatePost = async (postId: string) => {
    if (!activeClient || !authUser) {
      return;
    }
    const existing = posts;
    const post = existing.find((item) => item.id === postId);
    if (!post) {
      return;
    }
    const now = new Date().toISOString();
    const cloned: Post = {
      ...post,
      id: addPost(activeClient.id, post.date).id,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null
    };
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        postsByClient: {
          ...prev.postsByClient,
          [activeClient.id]: [...existing, cloned]
        }
      };
    });
    if (!userMeta) {
      return;
    }
    await createPostDoc(activeClient.id, cloned, userMeta);
  };

  const addMessage = async (postId: string, text: string) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const message = addChatMessage(text, userMeta);
    const target = posts.find((post) => post.id === postId);
    const threadMonthKey = target ? getMonthKey(target.date) : monthKey;
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPosts = (prev.postsByClient[activeClient.id] ?? []).map((post) =>
        post.id === postId
          ? {
              ...post,
              chat: [...post.chat, message],
              updatedAt: message.createdAt,
              lastMessageAt: message.createdAt
            }
          : post
      );
      return {
        ...prev,
        postsByClient: { ...prev.postsByClient, [activeClient.id]: nextPosts }
      };
    });
    await appendItemMessage(activeClient.id, "posts", postId, message, authUser.uid);
    await markThreadRead(authUser.uid, activeClient.id, threadMonthKey, postId, "post");
    setReadsById((prev) => ({ ...prev, [postId]: message.createdAt }));
  };

  const addEventMessage = async (eventId: string, text: string) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const message = addChatMessage(text, userMeta);
    const target = events.find((event) => event.id === eventId);
    const threadMonthKey = target ? getMonthKey(target.date) : monthKey;
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextEvents = (prev.eventsByClient[activeClient.id] ?? []).map((event) =>
        event.id === eventId
          ? {
              ...event,
              chat: [...event.chat, message],
              updatedAt: message.createdAt,
              lastMessageAt: message.createdAt
            }
          : event
      );
      return {
        ...prev,
        eventsByClient: { ...prev.eventsByClient, [activeClient.id]: nextEvents }
      };
    });
    await appendItemMessage(activeClient.id, "events", eventId, message, authUser.uid);
    await markThreadRead(authUser.uid, activeClient.id, threadMonthKey, eventId, "event");
    setReadsById((prev) => ({ ...prev, [eventId]: message.createdAt }));
  };

  const addPaidMessage = async (paidId: string, text: string) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const message = addChatMessage(text, userMeta);
    const target = paid.find((item) => item.id === paidId);
    const threadMonthKey = target ? getMonthKey(target.startDate) : monthKey;
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPaid = (prev.paidByClient[activeClient.id] ?? []).map((item) =>
        item.id === paidId
          ? {
              ...item,
              chat: [...item.chat, message],
              updatedAt: message.createdAt,
              lastMessageAt: message.createdAt
            }
          : item
      );
      return {
        ...prev,
        paidByClient: { ...prev.paidByClient, [activeClient.id]: nextPaid }
      };
    });
    await appendItemMessage(activeClient.id, "paids", paidId, message, authUser.uid);
    await markThreadRead(authUser.uid, activeClient.id, threadMonthKey, paidId, "paid");
    setReadsById((prev) => ({ ...prev, [paidId]: message.createdAt }));
  };

  const updateEvent = async (eventId: string, patch: Partial<EventItem>) => {
    if (!activeClient || !authUser) {
      return;
    }
    const updatedAt = new Date().toISOString();
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextEvents = (prev.eventsByClient[activeClient.id] ?? []).map((event) =>
        event.id === eventId ? { ...event, ...patch, updatedAt } : event
      );
      return {
        ...prev,
        eventsByClient: { ...prev.eventsByClient, [activeClient.id]: nextEvents }
      };
    });
    await updateItemDoc(
      activeClient.id,
      "events",
      eventId,
      stripTimestampPatch(patch)
    );
  };

  const updatePaid = async (paidId: string, patch: Partial<PaidItem>) => {
    if (!activeClient || !authUser) {
      return;
    }
    const updatedAt = new Date().toISOString();
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPaid = (prev.paidByClient[activeClient.id] ?? []).map((item) =>
        item.id === paidId ? { ...item, ...patch, updatedAt } : item
      );
      return {
        ...prev,
        paidByClient: { ...prev.paidByClient, [activeClient.id]: nextPaid }
      };
    });
    await updateItemDoc(
      activeClient.id,
      "paids",
      paidId,
      stripTimestampPatch(patch)
    );
  };

  const deleteEvent = async (eventId: string) => {
    if (!activeClient || !authUser) {
      return;
    }
    if (selectedItem?.type === "event" && selectedItem.id === eventId) {
      setSelectedItem(null);
    }
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextEvents = (prev.eventsByClient[activeClient.id] ?? []).filter(
        (event) => event.id !== eventId
      );
      return {
        ...prev,
        eventsByClient: { ...prev.eventsByClient, [activeClient.id]: nextEvents }
      };
    });
    await deleteItemDoc(activeClient.id, "events", eventId);
  };

  const deletePaid = async (paidId: string) => {
    if (!activeClient || !authUser) {
      return;
    }
    if (selectedItem?.type === "paid" && selectedItem.id === paidId) {
      setSelectedItem(null);
    }
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const nextPaid = (prev.paidByClient[activeClient.id] ?? []).filter(
        (item) => item.id !== paidId
      );
      return {
        ...prev,
        paidByClient: { ...prev.paidByClient, [activeClient.id]: nextPaid }
      };
    });
    await deleteItemDoc(activeClient.id, "paids", paidId);
  };

  const duplicateEvent = async (eventId: string) => {
    if (!activeClient || !authUser) {
      return;
    }
    const existing = events;
    const event = existing.find((item) => item.id === eventId);
    if (!event) {
      return;
    }
    const now = new Date().toISOString();
    const cloned: EventItem = {
      ...event,
      id: addEvent(activeClient.id, event.date).id,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null
    };
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        eventsByClient: {
          ...prev.eventsByClient,
          [activeClient.id]: [...existing, cloned]
        }
      };
    });
    await createEventDoc(activeClient.id, cloned, authUser.uid);
  };

  const duplicatePaid = async (paidId: string) => {
    if (!activeClient || !authUser) {
      return;
    }
    const existing = paid;
    const item = existing.find((paidItem) => paidItem.id === paidId);
    if (!item) {
      return;
    }
    const now = new Date().toISOString();
    const cloned: PaidItem = {
      ...item,
      id: addPaid(activeClient.id, item.startDate, item.endDate).id,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null
    };
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        paidByClient: {
          ...prev.paidByClient,
          [activeClient.id]: [...existing, cloned]
        }
      };
    });
    await createPaidDoc(activeClient.id, cloned, authUser.uid);
  };

  const debugPanel = (
    <DebugPanel
      enabled={debugEnabled}
      authUser={authUser}
      profile={profile}
      activeClientId={data?.activeClientId ?? ""}
      monthKey={monthKey}
      selectedDate={selectedDate}
    />
  );

  if (loading) {
    return (
      <div className="p-10 text-sm text-ink/60">
        Cargando...
        {debugPanel}
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen px-6 pb-10 pt-6">
        <div className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl bg-white/70 p-8 text-center shadow-soft">
          <h1 className="text-2xl font-semibold text-ink">Calendario Post</h1>
          <p className="text-sm text-ink/60">
            Para acceder al calendario, iniciá sesión con Google.
          </p>
          <button
            type="button"
            onClick={() => {
              void loginWithGoogle();
            }}
            className="mx-auto rounded-full bg-skydeep px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            Entrar con Google
          </button>
        </div>
        {debugPanel}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-sm text-ink/60">
        Cargando datos...
        {debugPanel}
      </div>
    );
  }

  if (!data.activeClientId || !activeClient) {
    return (
      <div className="min-h-screen px-6 pb-10 pt-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Header
            onOpenSettings={() => setSettingsOpen(true)}
            user={authUser}
            clients={data.clients}
            activeClientId={data.activeClientId}
            isAdmin={isAdmin}
            onSelectClient={handleSelectClient}
            onCreateClient={handleCreateClient}
            onLogout={() => {
              void logout();
            }}
          />
          <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-ink/60 shadow-soft">
            {isAdmin
              ? "Crea un cliente para comenzar."
              : "Seleccioná un cliente asignado para comenzar."}
          </div>
          {debugPanel}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          user={authUser}
          clients={data.clients}
          activeClientId={data.activeClientId}
          isAdmin={isAdmin}
          onSelectClient={handleSelectClient}
          onCreateClient={handleCreateClient}
          onLogout={() => {
            void logout();
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-semibold">Calendario mensual</h1>
                <p className="text-sm text-ink/60">Planificacion simple de posteos.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalTab("post");
                    setAddModalOpen(true);
                  }}
                  className="rounded-full bg-skydeep px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  + Publicacion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddModalTab("event");
                    setAddModalOpen(true);
                  }}
                  className="rounded-full border border-peach/40 bg-peach/20 px-4 py-2 text-xs font-semibold text-peach shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  + Evento
                </button>
                {activeClient?.enablePaid ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalTab("paid");
                      setAddModalOpen(true);
                    }}
                    className="rounded-full border border-ink/20 bg-ink/5 px-4 py-2 text-xs font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    + Pauta
                  </button>
                ) : null}
              </div>
            </div>

            {loadingData ? (
              <div className="rounded-xl bg-white/70 p-6 text-sm text-ink/60 shadow-soft">
                Cargando calendario...
              </div>
            ) : (
              <CalendarMonth
                viewDate={viewDate}
                selectedDate={selectedDate}
                posts={posts}
                events={events}
                paid={paid}
                axes={activeClient?.axes ?? []}
                dayUpdates={dayUpdates ?? EMPTY_MAP}
                onSelectDate={handleSelectDate}
                onQuickAdd={(dateKey) => {
                  setSelectedDate(dateKey);
                  setAddModalTab("post");
                  setAddModalOpen(true);
                }}
              />
            )}

            <FooterSummary
              viewDate={viewDate}
              onChangeMonth={handleMonthChange}
              posts={posts}
              channels={activeClient?.channels ?? []}
              axes={activeClient?.axes ?? []}
            />
          </div>

          <RightPanel
            viewDate={viewDate}
            selectedDate={selectedDateObj}
            posts={postsForDay}
            events={eventsForDay}
            paid={paidForDay}
            allPosts={posts}
            allEvents={events}
            allPaid={paid}
            selectedItem={selectedItem}
            onSelectPost={(postId) => setSelectedItem({ type: "post", id: postId })}
            onSelectEvent={(eventId) => setSelectedItem({ type: "event", id: eventId })}
            onSelectPaid={(paidId) => setSelectedItem({ type: "paid", id: paidId })}
            onOpenAdd={() => {
              setAddModalTab("post");
              setAddModalOpen(true);
            }}
            channels={activeClient?.channels ?? []}
            paidChannels={activeClient?.paidChannels ?? []}
            axes={activeClient?.axes ?? []}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
            onDuplicatePost={duplicatePost}
            onAddMessage={addMessage}
            onAddEventMessage={addEventMessage}
            onUpdateEvent={updateEvent}
            onDeleteEvent={deleteEvent}
            onDuplicateEvent={duplicateEvent}
            onAddPaidMessage={addPaidMessage}
            onUpdatePaid={updatePaid}
            onDeletePaid={deletePaid}
            onDuplicatePaid={duplicatePaid}
            enablePaid={activeClient?.enablePaid ?? false}
            unreadById={unreadById}
            currentUser={userMeta ?? { uid: authUser.uid }}
          />
          {debugPanel}
        </div>
      </div>

      <AddItemModal
        isOpen={addModalOpen}
        defaultDate={selectedDate}
        initialTab={
          addModalTab === "paid" && !activeClient?.enablePaid ? "post" : addModalTab
        }
        channels={activeClient?.channels ?? []}
        paidChannels={activeClient?.paidChannels ?? []}
        axes={activeClient?.axes ?? []}
        enablePaid={activeClient?.enablePaid ?? false}
        onClose={() => setAddModalOpen(false)}
        onCreatePost={(payload) => {
          void handleAddPost(payload);
        }}
        onCreateEvent={(payload) => {
          void handleAddEvent(payload);
        }}
        onCreatePaid={(payload) => {
          void handleAddPaid(payload);
        }}
      />

      <SettingsModal
        isOpen={settingsOpen}
        data={data}
        onClose={() => setSettingsOpen(false)}
        onSelectClient={handleSelectClient}
        onUpdateClient={handleUpdateClient}
        onCreateClient={handleCreateClient}
        isAdmin={isAdmin}
      />
    </div>
  );
}
