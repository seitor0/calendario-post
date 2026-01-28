"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile, UserRole, UserRoles } from "./types";

export const useUserProfile = (uid?: string | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setProfile(null);
          setLoadingProfile(false);
          return;
        }
        const data = snapshot.data() as {
          displayName?: string;
          email?: string;
          role?: string;
          roles?: UserRoles;
          allowedClients?: string[];
        };
        const role: UserRole | undefined =
          data.role === "admin" || data.role === "member" ? data.role : undefined;
        setProfile({
          id: snapshot.id,
          displayName: data.displayName ?? undefined,
          email: data.email ?? undefined,
          role,
          roles: data.roles ?? {},
          allowedClients: Array.isArray(data.allowedClients) ? data.allowedClients : []
        });
        setLoadingProfile(false);
      },
      () => {
        setProfile(null);
        setLoadingProfile(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [uid]);

  return { profile, loadingProfile };
};
