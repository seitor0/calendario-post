"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ApprovalUser, ChatMessage } from "@/lib/types";

const linkRegex = /(https?:\/\/[^\s]+)/g;

function renderText(text: string) {
  const parts = text.split(linkRegex);
  return parts.map((part, index) => {
    if (part.match(linkRegex)) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-skydeep underline"
        >
          {part}
        </a>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

type ChatBoxProps = {
  messages: ChatMessage[];
  onAdd: (text: string) => void;
  currentUser?: ApprovalUser;
};

export default function ChatBox({ messages, onAdd, currentUser }: ChatBoxProps) {
  const [text, setText] = useState("");
  const authorLabel = currentUser?.name || currentUser?.email || "Usuario";

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    onAdd(text.trim());
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-soft flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white p-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-ink/50">Todavia no hay comentarios.</p>
        ) : (
          sorted.map((message) => {
            const isOwn = currentUser?.uid && message.authorUid === currentUser.uid;
            const authorName =
              message.authorName || message.authorEmail || message.author || "Usuario";
            return (
              <div
                key={message.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isOwn
                    ? "ml-auto border border-violet/20 bg-violet/10 text-ink"
                    : "border border-skydeep/10 bg-skysoft text-ink"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-70">
                  {authorName}
                </p>
              <p className="mt-1 leading-relaxed">{renderText(message.text)}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(message.createdAt).toLocaleString("es-AR")}
              </p>
            </div>
            );
          })
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-ink/60">Autor</label>
          <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs text-ink/70">
            {authorLabel}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="Escribi un comentario o pega un link"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-skydeep focus:outline-none"
        />
        <button
          type="submit"
          className="self-end rounded-full bg-skydeep px-4 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-soft"
        >
          Agregar comentario
        </button>
      </form>
    </div>
  );
}
