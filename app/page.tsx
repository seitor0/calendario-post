"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  fetchClientsForProfile,
  ensureUserProfile
} from "@/lib/storage";
import { isDateInRange, toISODate } from "@/lib/date";
import type { AppData, ApprovalUser, Client, EventItem, PaidItem, Post, UserProfile } from "@/lib/types";
import { useAuthUser } from "@/lib/useAuthUser";
import { loginWithGoogle, logout } from "@/lib/auth";

const EMPTY_MAP: Record<string, boolean> = {};

type SelectedItem = {
  type: "post" | "event" | "paid";
  id: string;
} | null;

function stripTimestampPatch<T extends { updatedAt?: string; createdAt?: string }>(patch: T) {
  const { updatedAt, createdAt, ...rest } = patch;
  return rest;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuthUser();
  const [data, setData] = useState<AppData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
  const userMeta: ApprovalUser | null = user
    ? {
        uid: user.uid,
        ...(user.displayName ? { name: user.displayName } : {}),
        ...(user.email ? { email: user.email } : {})
      }
    : null;

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setData(null);
      setUserProfile(null);
      return;
    }

    let isActive = true;
    const boot = async () => {
      if (!clearedLegacyRef.current) {
        clearLegacyLocalData();
        clearedLegacyRef.current = true;
      }
      const profile = await ensureUserProfile(user);
      const clients = await fetchClientsForProfile(profile);
      if (!isActive) {
        return;
      }
      const preferred = getPreferredClientId();
      const allowedIds = clients.map((client) => client.id);
      const nextActive =
        preferred && allowedIds.includes(preferred) ? preferred : allowedIds[0] ?? "";

      setUserProfile(profile);
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
  }, [authLoading, user]);

  const activeClient = data?.clients.find((client) => client.id === data.activeClientId) ?? null;
  const posts = activeClient ? data?.postsByClient[activeClient.id] ?? [] : [];
  const events = activeClient ? data?.eventsByClient[activeClient.id] ?? [] : [];
  const paid = activeClient && activeClient.enablePaid
    ? data?.paidByClient[activeClient.id] ?? []
    : [];

  const monthKey = useMemo(
    () => getMonthKey(toISODate(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1))),
    [viewDate]
  );

  useEffect(() => {
    if (!user || !data?.activeClientId) {
      return;
    }
    let isActive = true;
    const load = async () => {
      setLoadingData(true);
      const { posts, events, paid } = await loadClientMonthData(data.activeClientId, monthKey);
      const [reads, seen] = await Promise.all([
        loadThreadReads(user.uid, data.activeClientId, monthKey),
        loadDaySeen(user.uid, monthKey)
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
  }, [user, data?.activeClientId, monthKey]);

  useEffect(() => {
    if (!data?.activeClientId) {
      return;
    }
    setPreferredClientId(data.activeClientId);
    setSelectedItem(null);
  }, [data?.activeClientId]);

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
    if (!user || !activeClient || !selectedItem) {
      return;
    }
    const collection = selectedItem.type === "post" ? posts : selectedItem.type === "event" ? events : paid;
    const item = collection.find((entry) => entry.id === selectedItem.id);
    if (!item) {
      return;
    }
    const dateKey = "date" in item ? item.date : item.startDate;
    const itemMonthKey = getMonthKey(dateKey);
    void markThreadRead(user.uid, activeClient.id, itemMonthKey, item.id, selectedItem.type).then(() => {
      setReadsById((prev) => ({ ...prev, [item.id]: new Date().toISOString() }));
    });
  }, [user, activeClient, selectedItem, posts, events, paid]);

  useEffect(() => {
    if (!user || !activeClient) {
      return;
    }
    void markDaySeen(user.uid, selectedDate).then(() => {
      setDaySeen((prev) => ({ ...prev, [selectedDate]: new Date().toISOString() }));
    });
  }, [user, activeClient, selectedDate]);

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
    if (!user || !userProfile || userProfile.role !== "admin") {
      return;
    }
    const newClient = await createClient(name, user, enablePaid);
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
    if (userProfile?.role === "admin") {
      await updateClient(clientId, patch);
    }
  };

  const handleAddPost = async (payload: AddPostPayload) => {
    if (!activeClient || !user || !userMeta) {
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
    if (!activeClient || !user) {
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
    await createEventDoc(activeClient.id, newEvent, user.uid);
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setSelectedItem({ type: "event", id: newEvent.id });
    setAddModalOpen(false);
  };

  const handleAddPaid = async (payload: AddPaidPayload) => {
    if (!activeClient || !user) {
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
    await createPaidDoc(activeClient.id, newItem, user.uid);
    setSelectedDate(payload.startDate);
    setViewDate(new Date(`${payload.startDate}T00:00:00`));
    setAddModalOpen(false);
  };

  const updatePost = async (
    postId: string,
    patch: Partial<Post>,
    firestorePatch?: Record<string, any>
  ) => {
    if (!activeClient || !user) {
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
    if (!activeClient || !user) {
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
    if (!activeClient || !user) {
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
    if (!activeClient || !user || !userMeta) {
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
    await appendItemMessage(activeClient.id, "posts", postId, message, user.uid);
    await markThreadRead(user.uid, activeClient.id, threadMonthKey, postId, "post");
    setReadsById((prev) => ({ ...prev, [postId]: message.createdAt }));
  };

  const addEventMessage = async (eventId: string, text: string) => {
    if (!activeClient || !user || !userMeta) {
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
    await appendItemMessage(activeClient.id, "events", eventId, message, user.uid);
    await markThreadRead(user.uid, activeClient.id, threadMonthKey, eventId, "event");
    setReadsById((prev) => ({ ...prev, [eventId]: message.createdAt }));
  };

  const addPaidMessage = async (paidId: string, text: string) => {
    if (!activeClient || !user || !userMeta) {
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
    await appendItemMessage(activeClient.id, "paids", paidId, message, user.uid);
    await markThreadRead(user.uid, activeClient.id, threadMonthKey, paidId, "paid");
    setReadsById((prev) => ({ ...prev, [paidId]: message.createdAt }));
  };

  const updateEvent = async (eventId: string, patch: Partial<EventItem>) => {
    if (!activeClient || !user) {
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
    if (!activeClient || !user) {
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
    if (!activeClient || !user) {
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
    if (!activeClient || !user) {
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
    if (!activeClient || !user) {
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
    await createEventDoc(activeClient.id, cloned, user.uid);
  };

  const duplicatePaid = async (paidId: string) => {
    if (!activeClient || !user) {
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
    await createPaidDoc(activeClient.id, cloned, user.uid);
  };

  if (authLoading) {
    return <div className="p-10 text-sm text-ink/60">Cargando...</div>;
  }

  if (!user) {
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
      </div>
    );
  }

  if (!data) {
    return <div className="p-10 text-sm text-ink/60">Cargando datos...</div>;
  }

  if (!data.activeClientId || !activeClient) {
    return (
      <div className="min-h-screen px-6 pb-10 pt-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Header
            onOpenSettings={() => setSettingsOpen(true)}
            user={user}
            clients={data.clients}
            activeClientId={data.activeClientId}
            isAdmin={userProfile?.role === "admin"}
            onSelectClient={handleSelectClient}
            onCreateClient={handleCreateClient}
            onLogout={() => {
              void logout();
            }}
          />
          <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-ink/60 shadow-soft">
            {userProfile?.role === "admin"
              ? "Crea un cliente para comenzar."
              : "Seleccioná un cliente asignado para comenzar."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          user={user}
          clients={data.clients}
          activeClientId={data.activeClientId}
          isAdmin={userProfile?.role === "admin"}
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
            currentUser={userMeta ?? { uid: user.uid }}
          />
        </div>
      </div>

      <AddItemModal
        isOpen={addModalOpen}
        defaultDate={selectedDate}
        initialTab={activeClient?.enablePaid ? addModalTab : "post"}
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
        isAdmin={userProfile?.role === "admin"}
      />
    </div>
  );
}
