"use client";

import ChatBox from "@/components/ChatBox";
import { useEffect, useState } from "react";
import type { Axis, ChatAuthor, PaidItem, PostStatus } from "@/lib/types";

type PaidEditorProps = {
  item: PaidItem | null;
  paidChannels: string[];
  axes: Axis[];
  onUpdate: (paidId: string, patch: Partial<PaidItem>) => void;
  onDelete: (paidId: string) => void;
  onDuplicate: (paidId: string) => void;
  onAddMessage: (paidId: string, text: string, author: ChatAuthor) => void;
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

export default function PaidEditor({
  item,
  paidChannels,
  axes,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddMessage
}: PaidEditorProps) {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(false);
  }, [item?.id]);
  if (!item) {
    return (
      <div className="rounded-xl bg-white/70 p-6 text-sm text-ink/60 shadow-soft">
        Selecciona una pauta para editar sus detalles.
      </div>
    );
  }

  const togglePaidChannel = (channel: string) => {
    const next = item.paidChannels.includes(channel)
      ? item.paidChannels.filter((value) => value !== channel)
      : [...item.paidChannels, channel];
    onUpdate(item.id, { paidChannels: next });
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Titulo de la pauta</label>
        <input
          value={item.title}
          onChange={(event) => {
            onUpdate(item.id, { title: event.target.value });
            setHasChanges(true);
          }}
          placeholder="Titulo de la pauta"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/70 p-4 shadow-soft">
          <label className="text-xs font-medium text-ink/60">Fecha inicio</label>
          <input
            type="date"
            value={item.startDate}
            onChange={(event) => {
              onUpdate(item.id, { startDate: event.target.value });
              setHasChanges(true);
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="rounded-xl bg-white/70 p-4 shadow-soft">
          <label className="text-xs font-medium text-ink/60">Fecha fin</label>
          <input
            type="date"
            value={item.endDate}
            onChange={(event) => {
              onUpdate(item.id, { endDate: event.target.value });
              setHasChanges(true);
            }}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Chat / comentarios</label>
        <div className="mt-2 h-64">
          <ChatBox
            messages={item.chat}
            onAdd={(text, author) => onAddMessage(item.id, text, author)}
          />
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <p className="text-xs font-medium text-ink/60">Canales de pauta</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {paidChannels.length === 0 ? (
            <p className="text-xs text-ink/50">Defini canales de pauta en Settings.</p>
          ) : (
            paidChannels.map((channel) => (
              <label
                key={channel}
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                  item.paidChannels.includes(channel)
                    ? "border-ink bg-ink/10"
                    : "border-ink/10 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-ink"
                  checked={item.paidChannels.includes(channel)}
                  onChange={() => togglePaidChannel(channel)}
                />
                {channel}
              </label>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Contenido</label>
        <textarea
          value={item.paidContent}
          onChange={(event) => {
            onUpdate(item.id, { paidContent: event.target.value });
            setHasChanges(true);
          }}
          rows={4}
          placeholder="Descripcion del contenido pautado"
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/70 p-4 shadow-soft">
          <label className="text-xs font-medium text-ink/60">Inversion</label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              value={item.investmentAmount}
              onChange={(event) => {
                onUpdate(item.id, { investmentAmount: Number(event.target.value) || 0 });
                setHasChanges(true);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={item.investmentCurrency}
              onChange={(event) => {
                onUpdate(item.id, {
                  investmentCurrency: event.target.value as "ARS" | "USD"
                });
                setHasChanges(true);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div className="rounded-xl bg-white/70 p-4 shadow-soft">
          <label className="text-xs font-medium text-ink/60">Eje al que corresponde</label>
          <select
            value={item.axis ?? ""}
            onChange={(event) => {
              onUpdate(item.id, { axis: event.target.value });
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
                onUpdate(item.id, { status: status.value });
                setHasChanges(true);
              }}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                item.status === status.value
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
            onUpdate(item.id, { updatedAt: new Date().toISOString() });
            setHasChanges(false);
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          className="rounded-full border border-ink/20 bg-ink/10 px-4 py-2 text-xs font-semibold text-ink"
        >
          Duplicar pauta
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger"
        >
          Eliminar pauta
        </button>
      </div>
    </div>
  );
}
