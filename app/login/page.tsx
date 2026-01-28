"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { loginWithGoogle } from "@/lib/auth";

export default function LoginPage() {
  const { authUser, loading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authUser) {
      router.replace("/");
    }
  }, [loading, authUser, router]);

  if (loading) {
    return <div className="p-10 text-sm text-ink/60">Cargando...</div>;
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-6">
      <div className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl bg-white/70 p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-ink">Calendario Post</h1>
        <p className="text-sm text-ink/60">Iniciá sesión para continuar.</p>
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
