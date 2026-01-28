"use client";

import { useEffect, useMemo, useState } from "react";
import type { Axis } from "@/lib/types";

export type AddPostPayload = {
  date: string;
  title: string;
  channels: string[];
  axis?: string;
};

export type AddEventPayload = {
  date: string;
  title: string;
  note?: string;
  channels: string[];
  axis?: string;
};

export type AddPaidPayload = {
  startDate: string;
  endDate: string;
  title: string;
  paidChannels: string[];
  paidContent: string;
  investmentAmount: number;
  investmentCurrency: "ARS" | "USD";
  axis?: string;
};

type AddItemModalProps = {
  isOpen: boolean;
  defaultDate: string;
  initialTab?: TabKey;
  channels: string[];
  paidChannels: string[];
  axes: Axis[];
  enablePaid?: boolean;
  onClose: () => void;
  onCreatePost: (payload: AddPostPayload) => void;
  onCreateEvent: (payload: AddEventPayload) => void;
  onCreatePaid: (payload: AddPaidPayload) => void;
};

type TabKey = "post" | "event" | "paid";

export default function AddItemModal({
  isOpen,
  defaultDate,
  initialTab = "post",
  channels,
  paidChannels,
  axes,
  enablePaid = true,
  onClose,
  onCreatePost,
  onCreateEvent,
  onCreatePaid
}: AddItemModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("post");
  const [dateValue, setDateValue] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [note, setNote] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [axis, setAxis] = useState("");
  const [eventChannels, setEventChannels] = useState<string[]>([]);
  const [eventAxis, setEventAxis] = useState("");
  const [paidTitle, setPaidTitle] = useState("");
  const [paidChannelsSelected, setPaidChannelsSelected] = useState<string[]>([]);
  const [paidContent, setPaidContent] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paidCurrency, setPaidCurrency] = useState<"ARS" | "USD">("ARS");
  const [paidAxis, setPaidAxis] = useState("");
  const [paidEndDate, setPaidEndDate] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setActiveTab(enablePaid ? initialTab : "post");
    setDateValue(defaultDate);
    setPostTitle("");
    setEventTitle("");
    setNote("");
    setSelectedChannels([]);
    setAxis("");
    setEventChannels([]);
    setEventAxis("");
    setPaidTitle("");
    setPaidChannelsSelected([]);
    setPaidContent("");
    setPaidAmount("");
    setPaidCurrency("ARS");
    setPaidAxis("");
    setPaidEndDate("");
  }, [isOpen, defaultDate, initialTab, enablePaid]);

  const canCreatePost = useMemo(() => {
    if (!dateValue) {
      return false;
    }
    if (channels.length > 0 && selectedChannels.length === 0) {
      return false;
    }
    return true;
  }, [dateValue, channels.length, selectedChannels.length]);

  const canCreateEvent = Boolean(dateValue && eventTitle.trim());
  const endAfterStart = !paidEndDate || paidEndDate >= dateValue;
  const canCreatePaid = Boolean(dateValue && endAfterStart);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  const toggleEventChannel = (channel: string) => {
    setEventChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  const togglePaidChannel = (channel: string) => {
    setPaidChannelsSelected((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  };

  const handleCreate = () => {
    if (activeTab === "post") {
      if (!canCreatePost) {
        return;
      }
      onCreatePost({
        date: dateValue,
        title: postTitle.trim(),
        channels: selectedChannels,
        axis: axis || undefined
      });
      onClose();
      return;
    }
    if (activeTab === "event") {
      if (!canCreateEvent) {
        return;
      }
      onCreateEvent({
        date: dateValue,
        title: eventTitle.trim(),
        note: note.trim() || undefined,
        channels: eventChannels,
        axis: eventAxis || undefined
      });
      onClose();
      return;
    }
    if (!canCreatePaid) {
      return;
    }
    onCreatePaid({
      startDate: dateValue,
      endDate: paidEndDate && paidEndDate >= dateValue ? paidEndDate : dateValue,
      title: paidTitle.trim(),
      paidChannels: paidChannelsSelected,
      paidContent: paidContent.trim(),
      investmentAmount: Number(paidAmount) || 0,
      investmentCurrency: paidCurrency,
      axis: paidAxis || undefined
    });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="modal-card w-full max-w-xl rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agregar</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold"
          >
            Cancelar
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("post")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              activeTab === "post" ? "bg-skydeep text-white" : "bg-slate-200 text-ink/70"
            }`}
          >
            Publicacion
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("event")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              activeTab === "event" ? "bg-peach text-white" : "bg-slate-200 text-ink/70"
            }`}
          >
            Evento
          </button>
          {enablePaid ? (
            <button
              type="button"
              onClick={() => setActiveTab("paid")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                activeTab === "paid" ? "bg-ink text-white" : "bg-slate-200 text-ink/70"
              }`}
            >
              Pauta
            </button>
          ) : null}
        </div>

        <div className="mt-4 space-y-4">
          {activeTab !== "paid" ? (
            <div>
              <label className="text-xs font-medium text-ink/60">Fecha</label>
              <input
                type="date"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {!dateValue ? (
                <p className="mt-1 text-[11px] text-peach">Selecciona una fecha.</p>
              ) : null}
            </div>
          ) : null}

          {activeTab === "post" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/60">Titulo</label>
                <input
                  value={postTitle}
                  onChange={(event) => setPostTitle(event.target.value)}
                  placeholder="Titulo de la publicacion"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-ink/60">Canales</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {channels.length === 0 ? (
                    <p className="text-xs text-ink/50">Configura canales en Settings.</p>
                  ) : (
                    channels.map((channel) => (
                      <label
                        key={channel}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          selectedChannels.includes(channel)
                            ? "border-skydeep bg-skydeep/10"
                            : "border-ink/10 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-skydeep"
                          checked={selectedChannels.includes(channel)}
                          onChange={() => toggleChannel(channel)}
                        />
                        {channel}
                      </label>
                    ))
                  )}
                </div>
                {channels.length > 0 && selectedChannels.length === 0 ? (
                  <p className="mt-1 text-[11px] text-peach">
                    Selecciona al menos un canal.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Eje</label>
                <select
                  value={axis}
                  onChange={(event) => setAxis(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Sin eje</option>
                  {axes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeTab === "event" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/60">Titulo del evento</label>
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Titulo del evento"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                {!eventTitle.trim() ? (
                  <p className="mt-1 text-[11px] text-peach">Completa el titulo.</p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Nota (opcional)</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Nota"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-ink/60">Canales</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {channels.length === 0 ? (
                    <p className="text-xs text-ink/50">Configura canales en Settings.</p>
                  ) : (
                    channels.map((channel) => (
                      <label
                        key={channel}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          eventChannels.includes(channel)
                            ? "border-skydeep bg-skydeep/10"
                            : "border-ink/10 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-skydeep"
                          checked={eventChannels.includes(channel)}
                          onChange={() => toggleEventChannel(channel)}
                        />
                        {channel}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Eje</label>
                <select
                  value={eventAxis}
                  onChange={(event) => setEventAxis(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Sin eje</option>
                  {axes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink/60">Titulo</label>
                <input
                  value={paidTitle}
                  onChange={(event) => setPaidTitle(event.target.value)}
                  placeholder="Titulo de la pauta"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-ink/60">Canales de pauta</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {paidChannels.length === 0 ? (
                    <p className="text-xs text-ink/50">Configura canales de pauta en Settings.</p>
                  ) : (
                    paidChannels.map((channel) => (
                      <label
                        key={channel}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          paidChannelsSelected.includes(channel)
                            ? "border-ink bg-ink/10"
                            : "border-ink/10 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-ink"
                          checked={paidChannelsSelected.includes(channel)}
                          onChange={() => togglePaidChannel(channel)}
                        />
                        {channel}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Contenido</label>
                <textarea
                  value={paidContent}
                  onChange={(event) => setPaidContent(event.target.value)}
                  rows={3}
                  placeholder="Descripcion de la pauta"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Fecha inicio</label>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Fecha fin (opcional)</label>
                <input
                  type="date"
                  value={paidEndDate}
                  onChange={(event) => setPaidEndDate(event.target.value)}
                  placeholder="Fin (opcional)"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                {!endAfterStart ? (
                  <p className="mt-1 text-[11px] text-peach">
                    La fecha fin debe ser igual o posterior a la fecha inicio.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <label className="text-xs font-medium text-ink/60">Inversion</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(event) => setPaidAmount(event.target.value)}
                    placeholder="0"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/60">Moneda</label>
                  <select
                    value={paidCurrency}
                    onChange={(event) => setPaidCurrency(event.target.value as "ARS" | "USD")}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink/60">Eje</label>
                <select
                  value={paidAxis}
                  onChange={(event) => setPaidAxis(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Sin eje</option>
                  {axes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/10 px-4 py-2 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={
              activeTab === "post"
                ? !canCreatePost
                : activeTab === "event"
                  ? !canCreateEvent
                  : !canCreatePaid
            }
            className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
              activeTab === "post" ? "bg-skydeep" : activeTab === "event" ? "bg-peach" : "bg-ink"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
