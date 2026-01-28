"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { UserProfile, UserRoles } from "./types";

const buildProfile = (uid: string, data: {
  displayName?: string;
  email?: string;
  roles?: UserRoles;
  allowedClients?: string[];
}): UserProfile => ({
  id: uid,
  displayName: data.displayName ?? undefined,
  email: data.email ?? undefined,
  roles: data.roles ?? {},
  allowedClients: Array.isArray(data.allowedClients) ? data.allowedClients : []
});

export const useCurrentUser = () => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setAuthUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        return;
      }

      setLoading(true);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      const ref = doc(db, "users", nextUser.uid);
      const displayName = nextUser.displayName ?? "";
      const email = nextUser.email ?? "";

      const ensureDoc = async () => {
        try {
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              displayName,
              email,
              roles: {},
              allowedClients: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            await updateDoc(ref, {
              displayName,
              email,
              updatedAt: serverTimestamp()
            });
          }
        } catch {
          setProfile(null);
          setLoading(false);
        }
      };

      void ensureDoc();

      unsubscribeProfile = onSnapshot(
        ref,
        (snapshot) => {
          if (!snapshot.exists()) {
            setProfile(null);
            setLoading(false);
            return;
          }
          setProfile(buildProfile(snapshot.id, snapshot.data() as {
            displayName?: string;
            email?: string;
            roles?: UserRoles;
            allowedClients?: string[];
          }));
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const isAdmin = Boolean(profile?.roles?.admin);

  return { authUser, profile, loading, isAdmin };
};
