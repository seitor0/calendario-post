"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";
import { useUserProfile } from "@/lib/useUserProfile";
import { logout } from "@/lib/auth";
import type { UserRoles } from "@/lib/types";
import { useRouter } from "next/navigation";

const ROLE_KEYS = ["admin", "supervisor", "content", "validation", "design"] as const;

type ClientOption = {
  id: string;
  name: string;
};

type AdminUser = {
  uid: string;
  displayName?: string;
  email?: string;
  roles: UserRoles;
  allowedClients: string[];
};

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuthUser();
  const { profile, loadingProfile } = useUserProfile(user?.uid);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [draftRoles, setDraftRoles] = useState<UserRoles>({});
  const [draftClients, setDraftClients] = useState<string[]>([]);
  const isAdmin = Boolean(profile?.roles?.admin);

  useEffect(() => {
    if (authLoading || loadingProfile) {
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profile?.roles?.admin) {
      router.replace("/");
    }
  }, [authLoading, loadingProfile, user, profile, router]);

  useEffect(() => {
    if (authLoading || loadingProfile || !user || !isAdmin) {
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      const [userSnap, clientSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "clients"))
      ]);
      if (!active) {
        return;
      }
      const clientList = clientSnap.docs.map((docSnap) => {
        const data = docSnap.data() as { name?: string };
        return { id: docSnap.id, name: data.name ?? "Sin nombre" };
      });
      const userList = userSnap.docs.map((docSnap) => {
        const data = docSnap.data() as {
          displayName?: string;
          email?: string;
          roles?: UserRoles;
          allowedClients?: string[];
        };
        return {
          uid: docSnap.id,
          displayName: data.displayName ?? undefined,
          email: data.email ?? undefined,
          roles: data.roles ?? {},
          allowedClients: Array.isArray(data.allowedClients) ? data.allowedClients : []
        } satisfies AdminUser;
      });
      setClients(clientList);
      setUsers(userList);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [authLoading, loadingProfile, user, isAdmin]);

  const clientNameById = useMemo(() => {
    return clients.reduce<Record<string, string>>((acc, client) => {
      acc[client.id] = client.name;
      return acc;
    }, {});
  }, [clients]);

  const handleOpenEdit = (target: AdminUser) => {
    setEditing(target);
    setDraftRoles({ ...target.roles });
    setDraftClients(target.allowedClients);
  };

  const handleCloseEdit = () => {
    setEditing(null);
    setDraftRoles({});
    setDraftClients([]);
  };

  const toggleClient = (clientId: string) => {
    setDraftClients((prev) =>
      prev.includes(clientId) ? prev.filter((item) => item !== clientId) : [...prev, clientId]
    );
  };

  const toggleRole = (role: (typeof ROLE_KEYS)[number]) => {
    setDraftRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const handleSave = async () => {
    if (!editing) {
      return;
    }
    await updateDoc(doc(db, "users", editing.uid), {
      roles: draftRoles,
      allowedClients: draftClients
    });
    setUsers((prev) =>
      prev.map((item) =>
        item.uid === editing.uid
          ? { ...item, roles: { ...draftRoles }, allowedClients: [...draftClients] }
          : item
      )
    );
    handleCloseEdit();
  };

  if (authLoading) {
    return <div className="p-10 text-sm text-ink/60">Cargando...</div>;
  }

  if (authLoading || loadingProfile) {
    return <div className="p-10 text-sm text-ink/60">Cargando...</div>;
  }

  if (!user || !isAdmin) {
    return <div className="p-10 text-sm text-ink/60">Redirigiendo...</div>;
  }

  return (
    <div className="min-h-screen px-6 pb-10 pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/70 px-6 py-4 shadow-soft">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Admin Usuarios</h1>
            <p className="text-xs text-ink/60">Gestioná roles y clientes por usuario.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-semibold text-ink"
          >
            Salir
          </button>
        </header>

        <section className="rounded-2xl bg-white/70 p-4 shadow-soft">
          {loading ? (
            <p className="text-sm text-ink/60">Cargando usuarios...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-ink/60">
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">UID</th>
                    <th className="px-3 py-2">Clientes</th>
                    <th className="px-3 py-2">Roles</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const clientLabels = item.allowedClients.map(
                      (clientId) => clientNameById[clientId] ?? clientId
                    );
                    const activeRoles = ROLE_KEYS.filter((role) => item.roles?.[role]);
                    return (
                      <tr key={item.uid} className="border-t border-slate-200/50">
                        <td className="px-3 py-3 font-semibold text-ink">
                          {item.displayName || "Sin nombre"}
                        </td>
                        <td className="px-3 py-3 text-ink/70">{item.email || "-"}</td>
                        <td className="px-3 py-3 text-ink/50">{item.uid}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {clientLabels.length === 0 ? (
                              <span className="rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-ink/50">
                                Sin clientes
                              </span>
                            ) : (
                              clientLabels.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full border border-skydeep/30 bg-skydeep/10 px-2 py-0.5 text-[10px] text-skydeep"
                                >
                                  {label}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {activeRoles.length === 0 ? (
                              <span className="rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-ink/50">
                                Sin roles
                              </span>
                            ) : (
                              activeRoles.map((role) => (
                                <span
                                  key={role}
                                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600"
                                >
                                  {role}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-full border border-ink/10 px-3 py-1 text-[11px] font-semibold"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Editar usuario</h2>
                <p className="text-xs text-ink/60">{editing.email || editing.uid}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-ink/60">Clientes permitidos</p>
                <div className="mt-3 space-y-2">
                  {clients.length === 0 ? (
                    <p className="text-xs text-ink/50">No hay clientes cargados.</p>
                  ) : (
                    clients.map((client) => (
                      <label key={client.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="accent-skydeep"
                          checked={draftClients.includes(client.id)}
                          onChange={() => toggleClient(client.id)}
                        />
                        <span>{client.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink/60">Roles</p>
                <div className="mt-3 space-y-3">
                  {ROLE_KEYS.map((role) => (
                    <label key={role} className="flex items-center justify-between gap-3 text-xs">
                      <span className="capitalize text-ink/70">{role}</span>
                      <button
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`relative h-5 w-10 rounded-full transition ${
                          draftRoles[role] ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                        aria-pressed={draftRoles[role] ? "true" : "false"}
                      >
                        <span
                          className={`absolute top-1 h-3 w-3 rounded-full bg-white transition ${
                            draftRoles[role] ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded-full border border-ink/10 px-4 py-2 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-skydeep px-4 py-2 text-xs font-semibold text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
