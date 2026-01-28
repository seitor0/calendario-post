import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
  type DocumentReference,
  type Query,
  type SetOptions
} from "firebase/firestore";
import { auth } from "./firebase";

const nowMs = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
const isDebugEnabled = () =>
  process.env.NEXT_PUBLIC_DEBUG === "true" ||
  (typeof window !== "undefined" && window.location.search.includes("debug=1"));

const logError = (error: unknown) => {
  if (error && typeof error === "object") {
    const err = error as { code?: string; message?: string };
    console.error("error", {
      code: err.code,
      message: err.message
    });
    return;
  }
  console.error("error", error);
};

export const logAuthState = (label = "auth") => {
  const user = auth.currentUser;
  console.groupCollapsed(`[Debug] ${label}`);
  if (user) {
    console.log("uid", user.uid);
    console.log("email", user.email ?? "");
  } else {
    console.log("uid", null);
  }
  console.groupEnd();
};

export async function safeGetDoc<T = DocumentData>(
  ref: DocumentReference<T>,
  label: string
) {
  if (!isDebugEnabled()) {
    return getDoc(ref);
  }
  const start = nowMs();
  console.groupCollapsed(`[Firestore] getDoc ${label}`);
  console.log("path", ref.path);
  try {
    const snap = await getDoc(ref);
    console.log("ok", { exists: snap.exists() });
    return snap;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.log("ms", Math.round(nowMs() - start));
    console.groupEnd();
  }
}

export async function safeGetDocs<T = DocumentData>(
  q: Query<T>,
  label: string,
  meta?: Record<string, unknown>
) {
  if (!isDebugEnabled()) {
    return getDocs(q);
  }
  const start = nowMs();
  console.groupCollapsed(`[Firestore] getDocs ${label}`);
  console.log("query", label);
  if (meta) {
    console.log("meta", meta);
  }
  try {
    const snap = await getDocs(q);
    console.log("ok", { size: snap.size });
    return snap;
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.log("ms", Math.round(nowMs() - start));
    console.groupEnd();
  }
}

export async function safeSetDoc<T = DocumentData>(
  ref: DocumentReference<T>,
  data: T,
  options?: SetOptions,
  label = ref.path
) {
  if (!isDebugEnabled()) {
    await setDoc(ref, data, options);
    return;
  }
  const start = nowMs();
  console.groupCollapsed(`[Firestore] setDoc ${label}`);
  console.log("path", ref.path);
  try {
    await setDoc(ref, data, options);
    console.log("ok");
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.log("ms", Math.round(nowMs() - start));
    console.groupEnd();
  }
}

export async function safeUpdateDoc<T extends DocumentData>(
  ref: DocumentReference<T>,
  data: Partial<T>,
  label = ref.path
) {
  if (!isDebugEnabled()) {
    await updateDoc(ref, data as Record<string, unknown>);
    return;
  }
  const start = nowMs();
  console.groupCollapsed(`[Firestore] updateDoc ${label}`);
  console.log("path", ref.path);
  try {
    await updateDoc(ref, data as Record<string, unknown>);
    console.log("ok");
  } catch (error) {
    logError(error);
    throw error;
  } finally {
    console.log("ms", Math.round(nowMs() - start));
    console.groupEnd();
  }
}
