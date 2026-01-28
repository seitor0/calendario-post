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

export type ChatAuthor = "Cliente" | "Agencia";

export type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  authorUid?: string;
  authorName?: string;
  authorEmail?: string;
  author?: ChatAuthor | string;
};

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
  chat: ChatMessage[];
  brief?: ApprovalBlock;
  copyOut?: ApprovalBlock;
  pieceLink?: LinkApprovalBlock;
  createdAt: string;
  updatedAt: string;
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
  chat: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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
  chat: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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
  version: number;
  activeClientId: string;
  clients: Client[];
  postsByClient: Record<string, Post[]>;
  eventsByClient: Record<string, EventItem[]>;
  paidByClient: Record<string, PaidItem[]>;
};
