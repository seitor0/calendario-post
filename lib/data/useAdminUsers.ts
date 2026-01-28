"use client";

import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import type { UserRoles } from "@/lib/types";

export type AdminUser = {
  uid: string;
  displayName?: string;
  email?: string;
  roles: UserRoles;
  allowedClients: string[];
};

export type ClientOption = {
  id: string;
  name: string;
};

const isDev = process.env.NODE_ENV !== "production";

export function useAdminUsers(enabled: boolean) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setClients([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    if (isDev) {
      console.debug("[useAdminUsers] subscribe");
    }

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(
          snapshot.docs.map((docSnap) => {
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
          })
        );
        setLoading(false);
      },
      (err) => {
        if (isDev) {
          console.debug("[useAdminUsers] users error", err);
        }
        setError(err as Error);
        setLoading(false);
      }
    );

    const unsubscribeClients = onSnapshot(
      collection(db, "clients"),
      (snapshot) => {
        setClients(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as { name?: string };
            return { id: docSnap.id, name: data.name ?? "Sin nombre" };
          })
        );
      },
      (err) => {
        if (isDev) {
          console.debug("[useAdminUsers] clients error", err);
        }
        setError(err as Error);
      }
    );

    return () => {
      if (isDev) {
        console.debug("[useAdminUsers] unsubscribe");
      }
      unsubscribeUsers();
      unsubscribeClients();
    };
  }, [enabled]);

  const updateUser = useCallback(async (uid: string, roles: UserRoles, allowedClients: string[]) => {
    await updateDoc(doc(db, "users", uid), {
      roles,
      allowedClients
    });
  }, []);

  const clientNameById = useMemo(() => {
    return clients.reduce<Record<string, string>>((acc, client) => {
      acc[client.id] = client.name;
      return acc;
    }, {});
  }, [clients]);

  return { users, clients, loading, error, updateUser, clientNameById };
}
