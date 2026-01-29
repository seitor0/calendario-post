export type PostStatus =
  | "no_iniciado"
  | "en_proceso"
  | "esperando_feedback"
  | "aprobado"
  | "publicada";

export type UserRoles = {
  admin?: boolean;
  supervisor?: boolean;
  content?: boolean;
  validation?: boolean;
  design?: boolean;
  [key: string]: boolean | undefined;
};

export type UserProfile = {
  id: string;
  roles: UserRoles;
  allowedClients: string[];
  displayName?: string;
  email?: string;
};

// Chat types removed from UI (chat disabled). Keep placeholder if needed later.

export type Axis = {
  id: string;
  name: string;
  color: string;
};

export type ApprovalUser = {
  uid: string;
  name?: string;
  email?: string;
};

export type ApprovalBlock = {
  text: string;
  approved: boolean;
  approvedAt: string | null;
  approvedBy: ApprovalUser | null;
  updatedAt: string | null;
  updatedBy: ApprovalUser | null;
};

export type LinkApprovalBlock = {
  url: string;
  approved: boolean;
  approvedAt: string | null;
  approvedBy: ApprovalUser | null;
  updatedAt: string | null;
  updatedBy: ApprovalUser | null;
};

export type Post = {
  id: string;
  date: string;
  title: string;
  channels: string[];
  axis?: string;
  status: PostStatus;
  internalComment?: string;
  brief?: ApprovalBlock;
  copyOut?: ApprovalBlock;
  pieceLink?: LinkApprovalBlock;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  lastMessageAt?: string | null;
  // Etapa 2 (usuarios): userMeta: Record<userId, { lastSeenAt: string; unreadCount: number }>
};

export type EventItem = {
  id: string;
  date: string;
  title: string;
  note?: string;
  channels: string[];
  axis?: string;
  status: PostStatus;
  internalComment?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  lastMessageAt?: string | null;
  // Etapa 2 (usuarios): userMeta: Record<userId, { lastSeenAt: string; unreadCount: number }>
};

export type PaidItem = {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  status: PostStatus;
  axis?: string;
  internalComment?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  lastMessageAt?: string | null;
  paidChannels: string[];
  paidContent: string;
  investmentAmount: number;
  investmentCurrency: "ARS" | "USD";
};

export type Client = {
  id: string;
  name: string;
  logoDataUrl?: string;
  channels: string[];
  paidChannels: string[];
  enablePaid?: boolean;
  axes: Axis[];
};

export type AppData = {
  activeClientId: string;
  clients: Client[];
};

export type SyncStatus = "saved" | "saving" | "offline" | "error";
