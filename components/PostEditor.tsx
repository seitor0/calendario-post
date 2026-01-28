"use client";

import ChatBox from "@/components/ChatBox";
import { useEffect, useState } from "react";
import type {
  ApprovalBlock,
  ApprovalUser,
  Axis,
  ChatMessage,
  LinkApprovalBlock,
  Post,
  PostStatus
} from "@/lib/types";

type PostEditorProps = {
  post: Post | null;
  channels: string[];
  axes: Axis[];
  onUpdate: (postId: string, patch: Partial<Post>) => void;
  onDelete: (postId: string) => void;
  onDuplicate: (postId: string) => void;
  onSendMessage: (text: string) => void;
  messages: ChatMessage[];
  chatLoading: boolean;
  chatError: Error | null;
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

export default function PostEditor({
  post,
  channels,
  axes,
  onUpdate,
  onDelete,
  onDuplicate,
  onSendMessage,
  messages,
  chatLoading,
  chatError,
  currentUser
}: PostEditorProps) {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(false);
  }, [post?.id]);
  if (!post) {
    return (
      <div className="rounded-xl bg-white/70 p-6 text-sm text-ink/60 shadow-soft">
        Selecciona una publicacion para editar sus detalles.
      </div>
    );
  }

  const authorMeta: ApprovalUser = {
    uid: currentUser.uid,
    ...(currentUser.name ? { name: currentUser.name } : {}),
    ...(currentUser.email ? { email: currentUser.email } : {})
  };
  const emptyTextBlock: ApprovalBlock = {
    text: "",
    approved: false,
    approvedAt: null,
    approvedBy: null,
    updatedAt: null,
    updatedBy: null
  };
  const emptyLinkBlock: LinkApprovalBlock = {
    url: "",
    approved: false,
    approvedAt: null,
    approvedBy: null,
    updatedAt: null,
    updatedBy: null
  };
  const brief = post.brief ?? emptyTextBlock;
  const copyOut = post.copyOut ?? emptyTextBlock;
  const pieceLink = post.pieceLink ?? emptyLinkBlock;

  const toggleChannel = (channel: string) => {
    const next = post.channels.includes(channel)
      ? post.channels.filter((item) => item !== channel)
      : [...post.channels, channel];
    onUpdate(post.id, { channels: next });
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Titulo de la publicacion</label>
        <input
          value={post.title}
          onChange={(event) => {
            onUpdate(post.id, { title: event.target.value });
            setHasChanges(true);
          }}
          placeholder="Espacio para titulo de la publicacion"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-skydeep focus:outline-none"
        />
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Brief Pieza</label>
        <textarea
          value={brief.text}
          onChange={(event) => {
            const value = event.target.value;
            const now = new Date().toISOString();
            const nextBrief = { ...brief, text: value, updatedAt: now, updatedBy: authorMeta };
            onUpdate(post.id, { brief: nextBrief });
            setHasChanges(true);
          }}
          rows={3}
          placeholder="Escribí el brief..."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-skydeep focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={brief.approved}
              onChange={(event) => {
                const checked = event.target.checked;
                const now = new Date().toISOString();
                const nextBrief = {
                  ...brief,
                  approved: checked,
                  approvedAt: checked ? now : null,
                  approvedBy: checked ? authorMeta : null,
                  updatedAt: now,
                  updatedBy: authorMeta
                };
                onUpdate(post.id, { brief: nextBrief });
                setHasChanges(true);
              }}
              className="peer sr-only"
            />
            <span className="relative h-5 w-10 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500">
              <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-5" />
            </span>
            <span className="text-xs font-medium text-ink/70">Aprobado</span>
          </label>
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Copy Out</label>
        <textarea
          value={copyOut.text}
          onChange={(event) => {
            const value = event.target.value;
            const now = new Date().toISOString();
            const nextCopy = { ...copyOut, text: value, updatedAt: now, updatedBy: authorMeta };
            onUpdate(post.id, { copyOut: nextCopy });
            setHasChanges(true);
          }}
          rows={3}
          placeholder="Escribí el copy final..."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-skydeep focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={copyOut.approved}
              onChange={(event) => {
                const checked = event.target.checked;
                const now = new Date().toISOString();
                const nextCopy = {
                  ...copyOut,
                  approved: checked,
                  approvedAt: checked ? now : null,
                  approvedBy: checked ? authorMeta : null,
                  updatedAt: now,
                  updatedBy: authorMeta
                };
                onUpdate(post.id, { copyOut: nextCopy });
                setHasChanges(true);
              }}
              className="peer sr-only"
            />
            <span className="relative h-5 w-10 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500">
              <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-5" />
            </span>
            <span className="text-xs font-medium text-ink/70">Aprobado</span>
          </label>
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Link de pieza</label>
        <input
          value={pieceLink.url}
          onChange={(event) => {
            const value = event.target.value;
            const now = new Date().toISOString();
            const nextLink = { ...pieceLink, url: value, updatedAt: now, updatedBy: authorMeta };
            onUpdate(post.id, { pieceLink: nextLink });
            setHasChanges(true);
          }}
          placeholder="Pegá el link final..."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-skydeep focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={pieceLink.approved}
              onChange={(event) => {
                const checked = event.target.checked;
                const now = new Date().toISOString();
                const nextLink = {
                  ...pieceLink,
                  approved: checked,
                  approvedAt: checked ? now : null,
                  approvedBy: checked ? authorMeta : null,
                  updatedAt: now,
                  updatedBy: authorMeta
                };
                onUpdate(post.id, { pieceLink: nextLink });
                setHasChanges(true);
              }}
              className="peer sr-only"
            />
            <span className="relative h-5 w-10 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500">
              <span className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-5" />
            </span>
            <span className="text-xs font-medium text-ink/70">Aprobado</span>
          </label>
        </div>
      </div>

      <div className="rounded-xl bg-white/70 p-4 shadow-soft">
        <label className="text-xs font-medium text-ink/60">Chat / comentarios</label>
        <div className="mt-2 h-64">
          <ChatBox
            messages={messages}
            currentUser={currentUser}
            onAdd={(text) => onSendMessage(text)}
          />
          {chatLoading ? (
            <p className="mt-2 text-xs text-ink/50">Cargando mensajes...</p>
          ) : null}
          {chatError ? (
            <p className="mt-2 text-xs text-rose-600">Error al cargar chat.</p>
          ) : null}
        </div>
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
                    post.channels.includes(channel)
                      ? "border-skydeep bg-skydeep/10"
                      : "border-ink/10 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-skydeep"
                    checked={post.channels.includes(channel)}
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
            value={post.axis ?? ""}
            onChange={(event) => {
              onUpdate(post.id, { axis: event.target.value });
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
                onUpdate(post.id, { status: status.value });
                setHasChanges(true);
              }}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                post.status === status.value
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
            onUpdate(post.id, { updatedAt: new Date().toISOString() });
            setHasChanges(false);
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(post.id)}
          className="rounded-full border border-skydeep/30 bg-skydeep/10 px-4 py-2 text-xs font-semibold text-skydeep"
        >
          Duplicar publicacion
        </button>
        <button
          type="button"
          onClick={() => onDelete(post.id)}
          className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger"
        >
          Eliminar publicacion
        </button>
      </div>
    </div>
  );
}
