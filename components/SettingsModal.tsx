"use client";

import { ChangeEvent, useRef, useState } from "react";
import type { AppData, Axis, Client } from "@/lib/types";
import { makeId } from "@/lib/storage";

type SettingsModalProps = {
  isOpen: boolean;
  data: AppData | null;
  onClose: () => void;
  onSelectClient: (clientId: string) => void;
  onUpdateClient: (clientId: string, patch: Partial<Client>) => void;
  onCreateClient: (name: string, enablePaid: boolean) => void;
  isAdmin: boolean;
};

export default function SettingsModal({
  isOpen,
  data,
  onClose,
  onSelectClient,
  onUpdateClient,
  onCreateClient,
  isAdmin
}: SettingsModalProps) {
  const [newClientName, setNewClientName] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newPaidChannel, setNewPaidChannel] = useState("");
  const [newAxisName, setNewAxisName] = useState("");
  const [newAxisColor, setNewAxisColor] = useState("#6366F1");
  const [newClientEnablePaid, setNewClientEnablePaid] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !data) {
    return null;
  }

  const activeClient = data.clients.find((client) => client.id === data.activeClientId);

  const handleAddClient = () => {
    if (!newClientName.trim()) {
      return;
    }
    if (!isAdmin) {
      return;
    }
    onCreateClient(newClientName.trim(), newClientEnablePaid);
    setNewClientName("");
    setNewClientEnablePaid(false);
  };

  const handleUpdateClient = (clientId: string, patch: Partial<Client>) => {
    if (!isAdmin) {
      return;
    }
    onUpdateClient(clientId, patch);
  };

  const triggerLogoUpload = () => {
    fileRef.current?.click();
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeClient) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleUpdateClient(activeClient.id, { logoDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const addChannel = () => {
    if (!isAdmin || !activeClient || !newChannel.trim()) {
      return;
    }
    const nextChannels = [...activeClient.channels, newChannel.trim()];
    handleUpdateClient(activeClient.id, { channels: nextChannels });
    setNewChannel("");
  };

  const removeChannel = (channel: string) => {
    if (!isAdmin || !activeClient) {
      return;
    }
    handleUpdateClient(activeClient.id, {
      channels: activeClient.channels.filter((item) => item !== channel)
    });
  };

  const addPaidChannel = () => {
    if (!isAdmin || !activeClient || !newPaidChannel.trim()) {
      return;
    }
    const nextChannels = [...activeClient.paidChannels, newPaidChannel.trim()];
    handleUpdateClient(activeClient.id, { paidChannels: nextChannels });
    setNewPaidChannel("");
  };

  const removePaidChannel = (channel: string) => {
    if (!isAdmin || !activeClient) {
      return;
    }
    handleUpdateClient(activeClient.id, {
      paidChannels: activeClient.paidChannels.filter((item) => item !== channel)
    });
  };

  const addAxis = () => {
    if (!isAdmin || !activeClient || !newAxisName.trim()) {
      return;
    }
    const newAxis: Axis = {
      id: makeId(),
      name: newAxisName.trim(),
      color: newAxisColor
    };
    const nextAxes = [...activeClient.axes, newAxis];
    handleUpdateClient(activeClient.id, { axes: nextAxes });
    setNewAxisName("");
  };

  const removeAxis = (axisId: string) => {
    if (!isAdmin || !activeClient) {
      return;
    }
    handleUpdateClient(activeClient.id, {
      axes: activeClient.axes.filter((item) => item.id !== axisId)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="modal-card w-full max-w-3xl rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
        {!isAdmin ? (
          <p className="mt-2 text-xs text-ink/50">
            Solo administradores pueden editar configuraciones de clientes.
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-ink/60">Cliente activo</p>
              <select
                value={data.activeClientId}
                onChange={(event) => onSelectClient(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                {data.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-ink/60">Logo del cliente activo</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-skysoft">
                  {activeClient?.logoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeClient.logoDataUrl}
                      alt={activeClient.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/logo_borrador.png"
                      alt="Logo borrador"
                      className="h-full w-full object-contain p-1"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerLogoUpload}
                  className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"
                >
                  Subir logo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">Clientes</h3>
              <div className="mt-2 space-y-2">
                {data.clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-2">
                    <input
                      value={client.name}
                      onChange={(event) =>
                        handleUpdateClient(client.id, { name: event.target.value })
                      }
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => onSelectClient(client.id)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        data.activeClientId === client.id
                          ? "bg-skydeep text-white"
                          : "border border-ink/10"
                      }`}
                    >
                      Activo
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin ? (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold text-ink/60">Agregar cliente</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newClientName}
                    onChange={(event) => setNewClientName(event.target.value)}
                    placeholder="Nombre del cliente"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddClient}
                    className="rounded-full bg-skydeep px-3 py-2 text-xs font-semibold text-white"
                  >
                    Agregar
                  </button>
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-ink/60">
                  <input
                    type="checkbox"
                    checked={newClientEnablePaid}
                    onChange={(event) => setNewClientEnablePaid(event.target.checked)}
                    className="accent-skydeep"
                  />
                  Activar pauta para este cliente
                </label>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">Ejes de comunicacion</h3>
              <div className="mt-2 space-y-2">
                {activeClient?.axes.map((axis) => (
                  <div key={axis.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: axis.color }}
                      />
                      <input
                        value={axis.name}
                        onChange={(event) =>
                          handleUpdateClient(activeClient.id, {
                            axes: activeClient.axes.map((item) =>
                              item.id === axis.id ? { ...item, name: event.target.value } : item
                            )
                          })
                        }
                        className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <input
                        type="color"
                        value={axis.color}
                        onChange={(event) =>
                          handleUpdateClient(activeClient.id, {
                            axes: activeClient.axes.map((item) =>
                              item.id === axis.id ? { ...item, color: event.target.value } : item
                            )
                          })
                        }
                        className="h-7 w-7 rounded-md border border-slate-200 bg-white p-0.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAxis(axis.id)}
                      className="text-xs font-semibold text-danger"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newAxisName}
                  onChange={(event) => setNewAxisName(event.target.value)}
                  placeholder="Nuevo eje"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                <input
                  type="color"
                  value={newAxisColor}
                  onChange={(event) => setNewAxisColor(event.target.value)}
                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white p-1"
                />
                <button
                  type="button"
                  onClick={addAxis}
                  className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink">Canales</h3>
              <div className="mt-2 space-y-2">
                {activeClient?.channels.map((channel) => (
                  <div key={channel} className="flex items-center justify-between">
                    <span className="text-xs">{channel}</span>
                    <button
                      type="button"
                      onClick={() => removeChannel(channel)}
                      className="text-xs font-semibold text-danger"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={newChannel}
                  onChange={(event) => setNewChannel(event.target.value)}
                  placeholder="Nuevo canal"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={addChannel}
                  className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Canales de pauta</h3>
                <label className="flex items-center gap-2 text-[11px] text-ink/60">
                  <input
                    type="checkbox"
                    checked={activeClient?.enablePaid ?? false}
                    onChange={(event) => {
                      if (!activeClient) {
                        return;
                      }
                      const enablePaid = event.target.checked;
                      handleUpdateClient(activeClient.id, {
                        enablePaid,
                        paidChannels: enablePaid
                          ? activeClient.paidChannels.length > 0
                            ? activeClient.paidChannels
                            : [
                                "Google search / Meta Ads",
                                "Google Ads",
                                "LinkedIn Ads",
                                "TikTok Ads",
                                "Programmatic"
                              ]
                          : activeClient.paidChannels
                      });
                    }}
                    className="accent-skydeep"
                  />
                  Pauta activada
                </label>
              </div>
              {activeClient?.enablePaid ? (
                <>
                  <div className="mt-2 space-y-2">
                    {activeClient?.paidChannels.map((channel) => (
                      <div key={channel} className="flex items-center justify-between">
                        <span className="text-xs">{channel}</span>
                        <button
                          type="button"
                          onClick={() => removePaidChannel(channel)}
                          className="text-xs font-semibold text-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newPaidChannel}
                      onChange={(event) => setNewPaidChannel(event.target.value)}
                      placeholder="Nuevo canal de pauta"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={addPaidChannel}
                      className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold"
                    >
                      Agregar
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs text-ink/50">
                  Activa pauta para configurar canales.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
