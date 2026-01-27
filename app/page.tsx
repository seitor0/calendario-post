"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  addPost,
  addPaid,
  ensureClientRecord,
  loadData,
  saveData
} from "@/lib/storage";
import { isDateInRange, toISODate } from "@/lib/date";
import type { AppData, EventItem, PaidItem, Post } from "@/lib/types";

type SelectedItem = {
  type: "post" | "event" | "paid";
  id: string;
} | null;

export default function HomePage() {
  const [data, setData] = useState<AppData | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"post" | "event" | "paid">("post");

  useEffect(() => {
    const initial = loadData();
    setData(initial);
  }, []);

  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) {
        return prev;
      }
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  const activeClient = data?.clients.find((client) => client.id === data.activeClientId) ?? null;
  const posts = activeClient ? data?.postsByClient[activeClient.id] ?? [] : [];
  const events = activeClient ? data?.eventsByClient[activeClient.id] ?? [] : [];
  const paid = activeClient && activeClient.enablePaid
    ? data?.paidByClient[activeClient.id] ?? []
    : [];

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

  const handleAddPost = (payload: AddPostPayload) => {
    if (!activeClient) {
      return;
    }
    const newPost = addPost(activeClient.id, payload.date);
    newPost.title = payload.title;
    newPost.channels = payload.channels;
    newPost.axis = payload.axis;
    setSelectedItem({ type: "post", id: newPost.id });
    updateData((prev) => {
      const nextPostsByClient = ensureClientRecord(prev.postsByClient, activeClient.id);
      return {
        ...prev,
        postsByClient: {
          ...nextPostsByClient,
          [activeClient.id]: [...(nextPostsByClient[activeClient.id] ?? []), newPost]
        }
      };
    });
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setAddModalOpen(false);
  };

  const handleAddEvent = (payload: AddEventPayload) => {
    if (!activeClient) {
      return;
    }
    const newEvent = addEvent(activeClient.id, payload.date);
    newEvent.title = payload.title;
    newEvent.note = payload.note;
    newEvent.channels = payload.channels ?? [];
    newEvent.axis = payload.axis;
    newEvent.status = newEvent.status ?? "no_iniciado";
    newEvent.chat = newEvent.chat ?? [];
    updateData((prev) => {
      const nextEventsByClient = ensureClientRecord(prev.eventsByClient, activeClient.id);
      return {
        ...prev,
        eventsByClient: {
          ...nextEventsByClient,
          [activeClient.id]: [...(nextEventsByClient[activeClient.id] ?? []), newEvent]
        }
      };
    });
    setSelectedDate(payload.date);
    setViewDate(new Date(`${payload.date}T00:00:00`));
    setSelectedItem({ type: "event", id: newEvent.id });
    setAddModalOpen(false);
  };

  const handleAddPaid = (payload: AddPaidPayload) => {
    if (!activeClient) {
      return;
    }
    const newItem = addPaid(activeClient.id, payload.startDate, payload.endDate);
    newItem.title = payload.title;
    newItem.paidChannels = payload.paidChannels;
    newItem.paidContent = payload.paidContent;
    newItem.investmentAmount = payload.investmentAmount;
    newItem.investmentCurrency = payload.investmentCurrency;
    newItem.axis = payload.axis;
    setSelectedItem({ type: "paid", id: newItem.id });
    updateData((prev) => {
      const nextPaidByClient = ensureClientRecord(prev.paidByClient, activeClient.id);
      return {
        ...prev,
        paidByClient: {
          ...nextPaidByClient,
          [activeClient.id]: [...(nextPaidByClient[activeClient.id] ?? []), newItem]
        }
      };
    });
    setSelectedDate(payload.startDate);
    setViewDate(new Date(`${payload.startDate}T00:00:00`));
    setAddModalOpen(false);
  };

  const updatePost = (postId: string, patch: Partial<Post>) => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const nextPosts = (prev.postsByClient[activeClient.id] ?? []).map((post) =>
        post.id === postId
          ? { ...post, ...patch, updatedAt: new Date().toISOString() }
          : post
      );
      return {
        ...prev,
        postsByClient: { ...prev.postsByClient, [activeClient.id]: nextPosts }
      };
    });
  };

  const deletePost = (postId: string) => {
    if (!activeClient) {
      return;
    }
    if (selectedItem?.type === "post" && selectedItem.id === postId) {
      setSelectedItem(null);
    }
    updateData((prev) => {
      const nextPosts = (prev.postsByClient[activeClient.id] ?? []).filter(
        (post) => post.id !== postId
      );
      return {
        ...prev,
        postsByClient: { ...prev.postsByClient, [activeClient.id]: nextPosts }
      };
    });
  };

  const duplicatePost = (postId: string) => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const existing = prev.postsByClient[activeClient.id] ?? [];
      const post = existing.find((item) => item.id === postId);
      if (!post) {
        return prev;
      }
      const cloned: Post = {
        ...post,
        id: addPost(activeClient.id, post.date).id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...prev,
        postsByClient: {
          ...prev.postsByClient,
          [activeClient.id]: [...existing, cloned]
        }
      };
    });
  };

  const addMessage = (postId: string, text: string, author: "Cliente" | "Agencia") => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const nextPosts = (prev.postsByClient[activeClient.id] ?? []).map((post) =>
        post.id === postId
          ? { ...post, chat: [...post.chat, addChatMessage(text, author)] }
          : post
      );
      return {
        ...prev,
        postsByClient: { ...prev.postsByClient, [activeClient.id]: nextPosts }
      };
    });
  };

  const addEventMessage = (eventId: string, text: string, author: "Cliente" | "Agencia") => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const nextEvents = (prev.eventsByClient[activeClient.id] ?? []).map((event) =>
        event.id === eventId
          ? { ...event, chat: [...event.chat, addChatMessage(text, author)] }
          : event
      );
      return {
        ...prev,
        eventsByClient: { ...prev.eventsByClient, [activeClient.id]: nextEvents }
      };
    });
  };

  const addPaidMessage = (paidId: string, text: string, author: "Cliente" | "Agencia") => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const nextPaid = (prev.paidByClient[activeClient.id] ?? []).map((item) =>
        item.id === paidId ? { ...item, chat: [...item.chat, addChatMessage(text, author)] } : item
      );
      return {
        ...prev,
        paidByClient: { ...prev.paidByClient, [activeClient.id]: nextPaid }
      };
    });
  };

  const updateEvent = (eventId: string, patch: Partial<EventItem>) => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const nextEvents = (prev.eventsByClient[activeClient.id] ?? []).map((event) =>
        event.id === eventId
          ? { ...event, ...patch, updatedAt: new Date().toISOString() }
          : event
      );
      return {
        ...prev,
        eventsByClient: { ...prev.eventsByClient, [activeClient.id]: nextEvents }
      };
    });
  };

  const updatePaid = (paidId: string, patch: Partial<PaidItem>) => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const nextPaid = (prev.paidByClient[activeClient.id] ?? []).map((item) =>
        item.id === paidId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      );
      return {
        ...prev,
        paidByClient: { ...prev.paidByClient, [activeClient.id]: nextPaid }
      };
    });
  };

  const deleteEvent = (eventId: string) => {
    if (!activeClient) {
      return;
    }
    if (selectedItem?.type === "event" && selectedItem.id === eventId) {
      setSelectedItem(null);
    }
    updateData((prev) => {
      const nextEvents = (prev.eventsByClient[activeClient.id] ?? []).filter(
        (event) => event.id !== eventId
      );
      return {
        ...prev,
        eventsByClient: { ...prev.eventsByClient, [activeClient.id]: nextEvents }
      };
    });
  };

  const deletePaid = (paidId: string) => {
    if (!activeClient) {
      return;
    }
    if (selectedItem?.type === "paid" && selectedItem.id === paidId) {
      setSelectedItem(null);
    }
    updateData((prev) => {
      const nextPaid = (prev.paidByClient[activeClient.id] ?? []).filter(
        (item) => item.id !== paidId
      );
      return {
        ...prev,
        paidByClient: { ...prev.paidByClient, [activeClient.id]: nextPaid }
      };
    });
  };

  const duplicateEvent = (eventId: string) => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const existing = prev.eventsByClient[activeClient.id] ?? [];
      const event = existing.find((item) => item.id === eventId);
      if (!event) {
        return prev;
      }
      const cloned: EventItem = {
        ...event,
        id: addEvent(activeClient.id, event.date).id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...prev,
        eventsByClient: {
          ...prev.eventsByClient,
          [activeClient.id]: [...existing, cloned]
        }
      };
    });
  };

  const duplicatePaid = (paidId: string) => {
    if (!activeClient) {
      return;
    }
    updateData((prev) => {
      const existing = prev.paidByClient[activeClient.id] ?? [];
      const item = existing.find((paidItem) => paidItem.id === paidId);
      if (!item) {
        return prev;
      }
      const cloned: PaidItem = {
        ...item,
        id: addPaid(activeClient.id, item.startDate, item.endDate).id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...prev,
        paidByClient: {
          ...prev.paidByClient,
          [activeClient.id]: [...existing, cloned]
        }
      };
    });
  };

  if (!data) {
    return <div className="p-10 text-sm text-ink/60">Cargando...</div>;
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
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

            <CalendarMonth
              viewDate={viewDate}
              selectedDate={selectedDate}
              posts={posts}
              events={events}
              paid={paid}
              axes={activeClient?.axes ?? []}
              onSelectDate={handleSelectDate}
              onQuickAdd={(dateKey) => {
                setSelectedDate(dateKey);
                setAddModalTab("post");
                setAddModalOpen(true);
              }}
            />

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
          handleAddPost(payload);
        }}
        onCreateEvent={(payload) => {
          handleAddEvent(payload);
        }}
        onCreatePaid={(payload) => {
          handleAddPaid(payload);
        }}
      />

      <SettingsModal
        isOpen={settingsOpen}
        data={data}
        onClose={() => setSettingsOpen(false)}
        onUpdate={(next) => {
          setData(next);
          saveData(next);
        }}
      />
    </div>
  );
}
