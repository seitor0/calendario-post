import type { SyncStatus } from "@/lib/types";

export function deriveSyncStatus(
  online: boolean,
  hasPendingWrites: boolean,
  error: unknown
): SyncStatus {
  if (error) {
    return "error";
  }
  if (!online) {
    return "offline";
  }
  return hasPendingWrites ? "saving" : "saved";
}

export function combineSyncStatus(statuses: SyncStatus[]): SyncStatus {
  if (statuses.includes("error")) {
    return "error";
  }
  if (statuses.includes("offline")) {
    return "offline";
  }
  if (statuses.includes("saving")) {
    return "saving";
  }
  return "saved";
}
