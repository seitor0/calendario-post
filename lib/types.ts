export type PostStatus =
  | "no_iniciado"
  | "en_proceso"
  | "esperando_feedback"
  | "aprobado"
  | "publicada";

export type ChatAuthor = "Cliente" | "Agencia";

export type ChatMessage = {
  id: string;
  author: ChatAuthor;
  text: string;
  createdAt: string;
};

export type Axis = {
  id: string;
  name: string;
  color: string;
};

export type Post = {
  id: string;
  date: string;
  title: string;
  channels: string[];
  axis?: string;
  status: PostStatus;
  chat: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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
