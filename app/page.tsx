"use client";

import { useEffect, useMemo, useState } from "react";
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
import { isDateInRange, getMonthKey, toISODate } from "@/lib/date";
import type { ApprovalUser, Client, EventItem, PaidItem, Post, AppData, SyncStatus } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { loginWithGoogle, logout } from "@/lib/auth";
import {
  combineSyncStatus,
  createClient,
  getPreferredClientId,
  setPreferredClientId,
  updateClient,
  useClients,
  useEvents,
  usePaid,
  usePosts
} from "@/lib/data";
import { markDaySeen, markThreadRead, useDaySeen, useThreadReads } from "@/lib/data/useReads";

const EMPTY_MAP: Record<string, boolean> = {};

type SelectedItem = {
  type: "post" | "event" | "paid";
  id: string;
} | null;

export default function HomePage() {
  const { authUser, profile, loading, isAdmin } = useCurrentUser();
  const [activeClientId, setActiveClientId] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"post" | "event" | "paid">("post");

  const allowedClientIds = profile?.allowedClients ?? [];
  const { clients } = useClients(allowedClientIds);

  const activeClient = clients.find((client) => client.id === activeClientId) ?? null;

  useEffect(() => {
    if (loading || !profile) {
      setActiveClientId("");
      return;
    }
    const allowedIds = profile.allowedClients ?? [];
    if (allowedIds.length === 0) {
      setActiveClientId("");
      return;
    }
    const preferred = getPreferredClientId();
    const nextActive =
      preferred && allowedIds.includes(preferred)
        ? preferred
        : allowedIds[0] ?? "";
    setActiveClientId((prev) => (prev && allowedIds.includes(prev) ? prev : nextActive));
  }, [loading, profile]);

  useEffect(() => {
    if (!activeClientId) {
      return;
    }
    setPreferredClientId(activeClientId);
    setSelectedItem(null);
  }, [activeClientId]);

  const monthKey = useMemo(
    () => getMonthKey(toISODate(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1))),
    [viewDate]
  );

  const {
    data: posts,
    loading: loadingPosts,
    syncStatus: postsSyncStatus,
    createPost,
    updatePost,
    deletePost
  } = usePosts(activeClient?.id ?? null);

  const {
    data: events,
    loading: loadingEvents,
    syncStatus: eventsSyncStatus,
    createEvent,
    updateEvent,
    deleteEvent
  } = useEvents(activeClient?.id ?? null);

  const {
    data: paid,
    loading: loadingPaid,
    syncStatus: paidSyncStatus,
    createPaid,
    updatePaid,
    deletePaid
  } = usePaid(activeClient?.enablePaid ? activeClient.id : null);

  const { data: readsById } = useThreadReads(authUser?.uid ?? null, activeClient?.id ?? null, monthKey);
  const { data: daySeen } = useDaySeen(authUser?.uid ?? null, monthKey);

  const loadingData = loadingPosts || loadingEvents || (activeClient?.enablePaid ? loadingPaid : false);
  const syncStatus: SyncStatus = combineSyncStatus([
    postsSyncStatus,
    eventsSyncStatus,
    ...(activeClient?.enablePaid ? [paidSyncStatus] : [])
  ]);

  const userMeta: ApprovalUser | null = authUser
    ? {
        uid: authUser.uid,
        ...(authUser.displayName ? { name: authUser.displayName } : {}),
        ...(authUser.email ? { email: authUser.email } : {})
      }
    : null;

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
        `${item.endDate && item.endDate >= item.startDate ? item.endDate : item.startDate}T00:00:00`
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
    const collection =
      selectedItem.type === "post" ? posts : selectedItem.type === "event" ? events : paid;
    const item = collection.find((entry) => entry.id === selectedItem.id);
    if (!item) {
      return;
    }
    const dateKey = "date" in item ? item.date : item.startDate;
    const itemMonthKey = getMonthKey(dateKey);
    void markThreadRead(authUser.uid, activeClient.id, itemMonthKey, item.id, selectedItem.type);
  }, [authUser, profile, activeClient, selectedItem, posts, events, paid]);

  useEffect(() => {
    if (!authUser || !profile || !activeClient) {
      return;
    }
    if (!profile.allowedClients.includes(activeClient.id)) {
      return;
    }
    void markDaySeen(authUser.uid, selectedDate);
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
    setActiveClientId(clientId);
    setSelectedItem(null);
  };

  const handleCreateClient = async (name: string, enablePaid = false) => {
    if (!authUser || !profile || !isAdmin) {
      return;
    }
    const newClient = await createClient(name, authUser.uid, enablePaid);
    setActiveClientId(newClient.id);
    setPreferredClientId(newClient.id);
  };

  const handleUpdateClient = async (clientId: string, patch: Partial<Client>) => {
    if (!isAdmin) {
      return;
    }
    await updateClient(clientId, patch, authUser?.uid ?? undefined);
  };

  const handleAddPost = async (payload: AddPostPayload) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const newId = await createPost(
      {
        date: payload.date,
        title: payload.title,
        channels: payload.channels,
        axis: payload.axis
      },
      userMeta
    );
    if (!newId) {
      return;
    }
    setSelectedItem({ type: "post", id: newId });
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setAddModalOpen(false);
  };

  const handleAddEvent = async (payload: AddEventPayload) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const newId = await createEvent(
      {
        date: payload.date,
        title: payload.title,
        note: payload.note,
        channels: payload.channels ?? [],
        axis: payload.axis
      },
      userMeta
    );
    if (!newId) {
      return;
    }
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setSelectedItem({ type: "event", id: newId });
    setAddModalOpen(false);
  };

  const handleAddPaid = async (payload: AddPaidPayload) => {
    if (!activeClient || !authUser || !userMeta) {
      return;
    }
    const newId = await createPaid(
      {
        startDate: payload.startDate,
        endDate: payload.endDate,
        title: payload.title,
        paidChannels: payload.paidChannels,
        paidContent: payload.paidContent,
        investmentAmount: payload.investmentAmount,
        investmentCurrency: payload.investmentCurrency,
        axis: payload.axis
      },
      userMeta
    );
    if (!newId) {
      return;
    }
    setSelectedItem({ type: "paid", id: newId });
    setSelectedDate(payload.startDate);
    setViewDate(new Date(`${payload.startDate}T00:00:00`));
    setAddModalOpen(false);
  };

  const handleUpdatePost = async (postId: string, patch: Partial<Post>) => {
    if (!activeClient || !userMeta) {
      return;
    }
    await updatePost(postId, patch, userMeta);
  };

  const handleDeletePost = async (postId: string) => {
    if (!activeClient) {
      return;
    }
    if (selectedItem?.type === "post" && selectedItem.id === postId) {
      setSelectedItem(null);
    }
    await deletePost(postId);
  };

  const duplicatePost = async (postId: string) => {
    if (!activeClient || !userMeta) {
      return;
    }
    const post = posts.find((item) => item.id === postId);
    if (!post) {
      return;
    }
    const newId = await createPost(
      {
        date: post.date,
        title: post.title,
        channels: post.channels,
        axis: post.axis,
        status: post.status,
        brief: post.brief,
        copyOut: post.copyOut,
        pieceLink: post.pieceLink
      },
      userMeta
    );
    if (newId) {
      setSelectedItem({ type: "post", id: newId });
    }
  };

  const handleUpdateEvent = async (eventId: string, patch: Partial<EventItem>) => {
    if (!activeClient || !userMeta) {
      return;
    }
    await updateEvent(eventId, patch, userMeta);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!activeClient) {
      return;
    }
    if (selectedItem?.type === "event" && selectedItem.id === eventId) {
      setSelectedItem(null);
    }
    await deleteEvent(eventId);
  };

  const duplicateEvent = async (eventId: string) => {
    if (!activeClient || !userMeta) {
      return;
    }
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return;
    }
    const newId = await createEvent(
      {
        date: event.date,
        title: event.title,
        note: event.note,
        channels: event.channels,
        axis: event.axis,
        status: event.status
      },
      userMeta
    );
    if (newId) {
      setSelectedItem({ type: "event", id: newId });
    }
  };

  const handleUpdatePaid = async (paidId: string, patch: Partial<PaidItem>) => {
    if (!activeClient || !userMeta) {
      return;
    }
    await updatePaid(paidId, patch, userMeta);
  };

  const handleDeletePaid = async (paidId: string) => {
    if (!activeClient) {
      return;
    }
    if (selectedItem?.type === "paid" && selectedItem.id === paidId) {
      setSelectedItem(null);
    }
    await deletePaid(paidId);
  };

  const duplicatePaid = async (paidId: string) => {
    if (!activeClient || !userMeta) {
      return;
    }
    const item = paid.find((paidItem) => paidItem.id === paidId);
    if (!item) {
      return;
    }
    const newId = await createPaid(
      {
        startDate: item.startDate,
        endDate: item.endDate,
        title: item.title,
        status: item.status,
        axis: item.axis,
        paidChannels: item.paidChannels,
        paidContent: item.paidContent,
        investmentAmount: item.investmentAmount,
        investmentCurrency: item.investmentCurrency
      },
      userMeta
    );
    if (newId) {
      setSelectedItem({ type: "paid", id: newId });
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-sm text-ink/60">
        Cargando...
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
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-10 text-sm text-ink/60">
        Cargando datos...
      </div>
    );
  }

  if (!activeClientId || !activeClient) {
    return (
      <div className="min-h-screen px-6 pb-10 pt-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Header
            onOpenSettings={() => setSettingsOpen(true)}
            user={authUser}
            clients={clients}
            activeClientId={activeClientId}
            isAdmin={isAdmin}
            onSelectClient={handleSelectClient}
            onCreateClient={handleCreateClient}
            onLogout={() => {
              void logout();
            }}
            syncStatus={syncStatus}
          />
          <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-ink/60 shadow-soft">
            {isAdmin
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
          user={authUser}
          clients={clients}
          activeClientId={activeClientId}
          isAdmin={isAdmin}
          onSelectClient={handleSelectClient}
          onCreateClient={handleCreateClient}
          onLogout={() => {
            void logout();
          }}
          syncStatus={syncStatus}
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
                paid={activeClient?.enablePaid ? paid : []}
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
            clientId={activeClient.id}
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
            onUpdatePost={handleUpdatePost}
            onDeletePost={handleDeletePost}
            onDuplicatePost={duplicatePost}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onDuplicateEvent={duplicateEvent}
            onUpdatePaid={handleUpdatePaid}
            onDeletePaid={handleDeletePaid}
            onDuplicatePaid={duplicatePaid}
            enablePaid={activeClient?.enablePaid ?? false}
            unreadById={unreadById}
            currentUser={userMeta ?? { uid: authUser.uid }}
          />
        </div>
      </div>

      <AddItemModal
        isOpen={addModalOpen}
        defaultDate={selectedDate}
        initialTab={addModalTab === "paid" && !activeClient?.enablePaid ? "post" : addModalTab}
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
        data={{ activeClientId, clients } satisfies AppData}
        onClose={() => setSettingsOpen(false)}
        onSelectClient={handleSelectClient}
        onUpdateClient={handleUpdateClient}
        onCreateClient={handleCreateClient}
        isAdmin={isAdmin}
      />
    </div>
  );
}
