"use client";

import type { Axis, EventItem, Post, PaidItem } from "@/lib/types";
import { formatLongDate } from "@/lib/date";
import PostEditor from "@/components/PostEditor";
import EventEditor from "@/components/EventEditor";
import PaidEditor from "@/components/PaidEditor";
import MonthSnapshotCard from "@/components/MonthSnapshotCard";
import type { ChatAuthor } from "@/lib/types";

type SelectedItem = {
  type: "post" | "event" | "paid";
  id: string;
} | null;

type RightPanelProps = {
  viewDate: Date;
  selectedDate: Date;
  posts: Post[];
  events: EventItem[];
  paid: PaidItem[];
  allPosts: Post[];
  allEvents: EventItem[];
  allPaid: PaidItem[];
  selectedItem: SelectedItem;
  onSelectPost: (postId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onSelectPaid: (paidId: string) => void;
  onOpenAdd: () => void;
  onUpdatePost: (postId: string, patch: Partial<Post>) => void;
  onDeletePost: (postId: string) => void;
  onDuplicatePost: (postId: string) => void;
  onAddMessage: (postId: string, text: string, author: ChatAuthor) => void;
  onAddPaidMessage: (paidId: string, text: string, author: ChatAuthor) => void;
  onAddEventMessage: (eventId: string, text: string, author: ChatAuthor) => void;
  onUpdateEvent: (eventId: string, patch: Partial<EventItem>) => void;
  onDeleteEvent: (eventId: string) => void;
  onDuplicateEvent: (eventId: string) => void;
  onUpdatePaid: (paidId: string, patch: Partial<PaidItem>) => void;
  onDeletePaid: (paidId: string) => void;
  onDuplicatePaid: (paidId: string) => void;
  channels: string[];
  paidChannels: string[];
  axes: Axis[];
  enablePaid: boolean;
};

export default function RightPanel({
  viewDate,
  selectedDate,
  posts,
  events,
  paid,
  allPosts,
  allEvents,
  allPaid,
  selectedItem,
  onSelectPost,
  onSelectEvent,
  onSelectPaid,
  onOpenAdd,
  onUpdatePost,
  onDeletePost,
  onDuplicatePost,
  onAddMessage,
  onAddEventMessage,
  onAddPaidMessage,
  onUpdateEvent,
  onDeleteEvent,
  onDuplicateEvent,
  onUpdatePaid,
  onDeletePaid,
  onDuplicatePaid,
  channels,
  paidChannels,
  axes,
  enablePaid
}: RightPanelProps) {
  const selectedPost =
    selectedItem?.type === "post"
      ? posts.find((post) => post.id === selectedItem.id) ?? null
      : null;
  const selectedEvent =
    selectedItem?.type === "event"
      ? events.find((event) => event.id === selectedItem.id) ?? null
      : null;
  const selectedPaid =
    selectedItem?.type === "paid"
      ? paid.find((item) => item.id === selectedItem.id) ?? null
      : null;

  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-xl bg-white/70 p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink">
              {formatLongDate(selectedDate)}
            </p>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">
                  Organico
                </p>
                <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                  {posts.length === 0 ? (
                    <span className="text-xs text-ink/50">Sin publicaciones</span>
                  ) : (
                    posts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => onSelectPost(post.id)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          selectedItem?.type === "post" && selectedItem.id === post.id
                            ? "bg-violet text-white"
                            : "bg-slate-200 text-ink/70"
                        }`}
                      >
                        {post.title || "Publicacion"}
                      </button>
                    ))
                  )}
                </div>
              </div>
              {enablePaid ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">
                    Pauta
                  </p>
                  <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                    {paid.length === 0 ? (
                      <span className="text-xs text-ink/50">Sin pauta</span>
                    ) : (
                      paid.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectPaid(item.id)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            selectedItem?.type === "paid" && selectedItem.id === item.id
                              ? "bg-ink text-white"
                              : "bg-slate-200 text-ink/70"
                          }`}
                        >
                          $ {item.title || "Sin titulo"}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">
                  Eventos
                </p>
                <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                  {events.length === 0 ? (
                    <span className="text-xs text-ink/50">Sin eventos</span>
                  ) : (
                    events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event.id)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          selectedItem?.type === "event" && selectedItem.id === event.id
                            ? "bg-peach text-white"
                            : "bg-slate-200 text-ink/70"
                        }`}
                      >
                        {event.title || "Evento"}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenAdd}
              className="rounded-full bg-skydeep px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              Agregar
            </button>
          </div>
        </div>
      </section>

      <MonthSnapshotCard
        viewDate={viewDate}
        posts={allPosts}
        events={allEvents}
        paid={allPaid}
        enablePaid={enablePaid}
      />

      {selectedItem?.type === "event" ? (
        <EventEditor
          event={selectedEvent}
          channels={channels}
          axes={axes}
          onUpdate={onUpdateEvent}
          onDelete={onDeleteEvent}
          onDuplicate={onDuplicateEvent}
          onAddMessage={onAddEventMessage}
        />
      ) : selectedItem?.type === "paid" ? (
        <PaidEditor
          item={selectedPaid}
          paidChannels={paidChannels}
          axes={axes}
          onUpdate={onUpdatePaid}
          onDelete={onDeletePaid}
          onDuplicate={onDuplicatePaid}
          onAddMessage={onAddPaidMessage}
        />
      ) : (
        <PostEditor
          post={selectedPost}
          channels={channels}
          axes={axes}
          onUpdate={onUpdatePost}
          onDelete={onDeletePost}
          onDuplicate={onDuplicatePost}
          onAddMessage={onAddMessage}
        />
      )}
    </aside>
  );
}
