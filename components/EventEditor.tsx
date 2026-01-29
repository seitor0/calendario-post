"use client";

import { useEffect, useRef, useState } from "react";
import type { ApprovalUser, Axis, EventItem, PostStatus } from "@/lib/types";

type EventEditorProps = {
  event: EventItem | null;
  channels: string[];
  axes: Axis[];
  onUpdate: (eventId: string, patch: Partial<EventItem>) => Promise<void>;
  onDelete: (eventId: string) => void;
  onDuplicate: (eventId: string) => void;
  currentUser: ApprovalUser;
};

const statusOptions: { value: PostStatus; label: string }[] = [
  { value: "no_iniciado", label: "No iniciado" },
  { value: "en_proceso", label: "En proceso" },
  { value: "esperando_feedback", label: "Esperando feedback" },
  { value: "aprobado", label: "Aprobado" },
  { value: "publicada", label: "Publicada" }
];

const statusStyles: Record<PostStatus, string> = {
  no_iniciado: "bg-slate-200 text-ink/70",
  en_proceso: "bg-violet text-white",
  esperando_feedback: "bg-peach text-white",
  aprobado: "bg-skydeep text-white",
  publicada: "bg-emerald-600 text-white"
};

export default function EventEditor({
  event,
  channels,
  axes,
  onUpdate,
  onDelete,
  onDuplicate,
  currentUser
}: EventEditorProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [commentDraft, setCommentDraft] = useState(event?.internalComment ?? "");
  const [commentStatus, setCommentStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHasChanges(false);
    setCommentDraft(event?.internalComment ?? "");
    setCommentStatus("idle");
  }, [event?.id]);
  if (!event) {
    return (
      <div className="rounded-xl bg-white/70 p-6 text-sm text-ink/60 shadow-soft">
        Selecciona un evento para editar sus detalles.
      </div>
    );
  }

  const toggleChannel = (channel: string) => {
    const next = event.channels.includes(channel)
      ? event.channels.filter((item) => item !== channel)
      : [...event.channels, channel];
    onUpdate(event.id, { channels: next });
    setHasChanges(true);
  };

  useEffect(() => {
    if (!event) {
      return undefined;
    }
    if (commentDraft === (event.internalComment ?? "")) {
      return undefined;
    }
    setCommentStatus("saving");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate(event.id, { internalComment: commentDraft })
        .then(() => {
          setCommentStatus("saved");
        })
        .catch(() => {
          setCommentStatus("error");
        });
    }, 500);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [commentDraft, event, onUpdate]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Titulo del evento</label>
        <input
          value={event.title}
          onChange={(eventInput) => {
            onUpdate(event.id, { title: eventInput.target.value });
            setHasChanges(true);
          }}
          placeholder="Titulo del evento"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <label className="mt-3 block text-xs font-medium text-ink/60">Nota interna</label>
        <textarea
          value={event.note ?? ""}
          onChange={(eventInput) => {
            onUpdate(event.id, { note: eventInput.target.value });
            setHasChanges(true);
          }}
          rows={3}
          placeholder="Nota"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Comentario interno</label>
        <textarea
          value={commentDraft}
          onChange={(eventInput) => setCommentDraft(eventInput.target.value)}
          rows={4}
          placeholder="Escribi un comentario interno..."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-ink/60">
          {commentStatus === "saving"
            ? "Guardando..."
            : commentStatus === "saved"
              ? "Guardado"
              : commentStatus === "error"
                ? "Error al guardar"
                : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/70 p-4 shadow-soft">
          <p className="text-xs font-medium text-ink/60">Canales donde se publica</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {channels.length === 0 ? (
              <p className="text-xs text-ink/50">Defini canales en Settings.</p>
            ) : (
              channels.map((channel) => (
                <label
                  key={channel}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    event.channels.includes(channel)
                      ? "border-skydeep bg-skydeep/10"
                      : "border-ink/10 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-skydeep"
                    checked={event.channels.includes(channel)}
                    onChange={() => toggleChannel(channel)}
                  />
                  {channel}
                </label>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl bg-white/70 p-4 shadow-soft">
          <label className="text-xs font-medium text-ink/60">Eje al que corresponde</label>
          <select
            value={event.axis ?? ""}
            onChange={(eventInput) => {
              onUpdate(event.id, { axis: eventInput.target.value });
              setHasChanges(true);
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Sin eje</option>
            {axes.map((axis) => (
              <option key={axis.id} value={axis.id}>
                {axis.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <p className="text-xs font-medium text-ink/60">Estado</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => {
                onUpdate(event.id, { status: status.value });
                setHasChanges(true);
              }}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                event.status === status.value
                  ? `${statusStyles[status.value]} shadow-soft`
                  : "bg-slate-200 text-ink/60"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasChanges}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            hasChanges
              ? "bg-skydeep text-white hover:-translate-y-0.5 hover:shadow-soft"
              : "bg-slate-300 text-slate-500 cursor-not-allowed"
          }`}
          onClick={() => {
            onUpdate(event.id, { updatedAt: new Date().toISOString() });
            setHasChanges(false);
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(event.id)}
          className="rounded-full border border-skydeep/30 bg-skydeep/10 px-4 py-2 text-xs font-semibold text-skydeep"
        >
          Duplicar evento
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger"
        >
          Eliminar evento
        </button>
      </div>
    </div>
  );
}
