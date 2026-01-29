import { Timestamp } from "firebase/firestore";
import type {
  ApprovalBlock,
  ApprovalUser,
  Client,
  EventItem,
  LinkApprovalBlock,
  PaidItem,
  Post,
  PostStatus
} from "@/lib/types";
import { toISODate } from "@/lib/date";
import { AXIS_COLORS, PAID_CHANNEL_DEFAULTS } from "@/lib/data/helpers";

const VALID_STATUSES: PostStatus[] = [
  "no_iniciado",
  "en_proceso",
  "esperando_feedback",
  "aprobado",
  "publicada"
];

const nowIso = () => new Date().toISOString();

export function asIso(value?: Timestamp | string | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toDate().toISOString();
}

export function asDateKey(value?: Timestamp | string | null): string {
  if (!value) {
    return toISODate(new Date());
  }
  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  return toISODate(value.toDate());
}

function normalizeStatus(status?: string): PostStatus {
  if (status && VALID_STATUSES.includes(status as PostStatus)) {
    return status as PostStatus;
  }
  return "no_iniciado";
}

function normalizeApprovalUser(value: unknown): ApprovalUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const user = value as Partial<ApprovalUser>;
  if (!user.uid) {
    return null;
  }
  return {
    uid: user.uid,
    name: user.name,
    email: user.email
  };
}

export function normalizeApprovalBlock(value: unknown, fallbackUpdatedAt: string): ApprovalBlock {
  if (!value || typeof value !== "object") {
    return {
      text: "",
      approved: false,
      approvedAt: null,
      approvedBy: null,
      updatedAt: null,
      updatedBy: null
    };
  }
  const block = value as ApprovalBlock & {
    approvedAt?: Timestamp | string | null;
    updatedAt?: Timestamp | string | null;
  };
  return {
    text: block.text ?? "",
    approved: block.approved ?? false,
    approvedAt: asIso(block.approvedAt),
    approvedBy: normalizeApprovalUser(block.approvedBy),
    updatedAt: asIso(block.updatedAt) ?? fallbackUpdatedAt,
    updatedBy: normalizeApprovalUser(block.updatedBy)
  };
}

export function normalizeLinkBlock(value: unknown, fallbackUpdatedAt: string): LinkApprovalBlock {
  if (!value || typeof value !== "object") {
    return {
      url: "",
      approved: false,
      approvedAt: null,
      approvedBy: null,
      updatedAt: null,
      updatedBy: null
    };
  }
  const block = value as LinkApprovalBlock & {
    approvedAt?: Timestamp | string | null;
    updatedAt?: Timestamp | string | null;
  };
  return {
    url: block.url ?? "",
    approved: block.approved ?? false,
    approvedAt: asIso(block.approvedAt),
    approvedBy: normalizeApprovalUser(block.approvedBy),
    updatedAt: asIso(block.updatedAt) ?? fallbackUpdatedAt,
    updatedBy: normalizeApprovalUser(block.updatedBy)
  };
}

export function normalizePost(docId: string, data: Partial<Post> & {
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
  lastMessageAt?: Timestamp | string | null;
}): Post {
  const createdAt = asIso(data.createdAt) ?? nowIso();
  return {
    id: docId,
    date: asDateKey(data.date),
    title: data.title ?? "",
    channels: data.channels ?? [],
    axis: data.axis ?? undefined,
    status: normalizeStatus(data.status),
    internalComment: data.internalComment ?? "",
    brief: normalizeApprovalBlock(data.brief, createdAt),
    copyOut: normalizeApprovalBlock(data.copyOut, createdAt),
    pieceLink: normalizeLinkBlock(data.pieceLink, createdAt),
    createdAt,
    updatedAt: asIso(data.updatedAt) ?? createdAt,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    lastMessageAt: asIso(data.lastMessageAt)
  };
}

export function normalizeEvent(docId: string, data: Partial<EventItem> & {
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
  lastMessageAt?: Timestamp | string | null;
}): EventItem {
  const createdAt = asIso(data.createdAt) ?? nowIso();
  return {
    id: docId,
    date: asDateKey(data.date),
    title: data.title ?? "",
    note: data.note ?? "",
    channels: data.channels ?? [],
    axis: data.axis ?? undefined,
    status: normalizeStatus(data.status),
    internalComment: data.internalComment ?? "",
    createdAt,
    updatedAt: asIso(data.updatedAt) ?? createdAt,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    lastMessageAt: asIso(data.lastMessageAt)
  };
}

export function normalizePaid(docId: string, data: Partial<PaidItem> & {
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
  lastMessageAt?: Timestamp | string | null;
}): PaidItem {
  const createdAt = asIso(data.createdAt) ?? nowIso();
  const startDate = asDateKey(data.startDate);
  const endDate = data.endDate && data.endDate >= startDate ? data.endDate : startDate;
  return {
    id: docId,
    startDate,
    endDate,
    title: data.title ?? "",
    status: normalizeStatus(data.status),
    axis: data.axis ?? undefined,
    internalComment: data.internalComment ?? "",
    createdAt,
    updatedAt: asIso(data.updatedAt) ?? createdAt,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    lastMessageAt: asIso(data.lastMessageAt),
    paidChannels: data.paidChannels ?? [],
    paidContent: data.paidContent ?? "",
    investmentAmount: data.investmentAmount ?? 0,
    investmentCurrency: data.investmentCurrency ?? "ARS"
  };
}

// Chat normalization removed (chat disabled)

export function normalizeClient(docId: string, data: Partial<Client>): Client {
  const axes = (data.axes ?? []).map((axis, index) => ({
    ...axis,
    color: axis.color ?? AXIS_COLORS[index % AXIS_COLORS.length]
  }));
  const enablePaid = data.enablePaid ?? false;
  const paidChannels =
    enablePaid && data.paidChannels && data.paidChannels.length > 0
      ? data.paidChannels
      : enablePaid
        ? PAID_CHANNEL_DEFAULTS
        : [];

  return {
    id: docId,
    name: data.name ?? "",
    channels: data.channels ?? [],
    paidChannels,
    enablePaid,
    axes,
    logoDataUrl: data.logoDataUrl
  };
}
