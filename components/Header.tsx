"use client";

import { loginWithGoogle, logout } from "@/lib/auth";
import { useAuthUser } from "@/lib/useAuthUser";

type HeaderProps = {
  onOpenSettings: () => void;
};

export default function Header({ onOpenSettings }: HeaderProps) {
  const { user, loading } = useAuthUser();
  const displayName = user?.displayName || user?.email || "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/70 px-6 py-4 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-skysoft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_borrador.png"
              alt="Calendario Post"
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Calendario Post</p>
            <p className="text-xs text-ink/60">Planificacion diaria</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {loading ? (
          <span className="text-xs font-semibold text-ink/50">...</span>
        ) : user ? (
          <div className="flex items-center gap-3 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-skysoft text-xs font-semibold text-ink">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={displayName || "Usuario"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials || "?"}</span>
              )}
            </div>
            <span className="max-w-[140px] truncate">{displayName || "Usuario"}</span>
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-skydeep"
            >
              Salir
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              void loginWithGoogle();
            }}
            className="rounded-full border border-ink/10 bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-skydeep"
          >
            Entrar con Google
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Abrir configuracion"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-skydeep"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3.5l1.1 2.3a1 1 0 0 0 .8.6l2.5.4-1.8 1.7a1 1 0 0 0-.3.9l.5 2.4-2.2-1.2a1 1 0 0 0-1 0l-2.2 1.2.5-2.4a1 1 0 0 0-.3-.9L7.8 6.8l2.5-.4a1 1 0 0 0 .8-.6L12 3.5z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
