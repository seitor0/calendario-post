"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const displayName = user.displayName ?? "";
  const email = user.email ?? "";

  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      email,
      role: "member",
      roles: {},
      allowedClients: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return;
  }

  await updateDoc(ref, {
    displayName,
    email,
    updatedAt: serverTimestamp()
  });
}

export const useAuthUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        void ensureUserDoc(nextUser);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { user, loading };
};
