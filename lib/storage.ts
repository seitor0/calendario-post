import { AppData, Axis, ChatMessage, Client, EventItem, PaidItem, Post, PostStatus } from "./types";
import { toISODate } from "./date";

export const STORAGE_KEY = "calpost:v1";
export const DATA_VERSION = 1;
const AXIS_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#D946EF", "#06B6D4"];
const PAID_CHANNEL_DEFAULTS = [
  "Google search / Meta Ads",
  "Google Ads",
  "LinkedIn Ads",
  "TikTok Ads",
  "Programmatic"
];
const VALID_STATUSES: PostStatus[] = [
  "no_iniciado",
  "en_proceso",
  "esperando_feedback",
  "aprobado",
  "publicada"
];

export function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createSeedPosts(baseDate: Date, client: Client) {
  const month = baseDate.getMonth();
  const year = baseDate.getFullYear();
  const dates = [2, 6, 8, 12, 16, 20, 24, 28];
  const statuses: PostStatus[] = [
    "no_iniciado",
    "en_proceso",
    "esperando_feedback",
    "aprobado",
    "publicada"
  ];
  return dates.map((day, index) => {
    const date = new Date(year, month, day);
    const createdAt = nowIso();
    return {
      id: makeId(),
      date: toISODate(date),
      title: `Publicacion ${index + 1}`,
      channels: [client.channels[index % client.channels.length]],
      axis: client.axes[index % client.axes.length]?.id,
      status: statuses[index % statuses.length],
      chat: [
        {
          id: makeId(),
          author: index % 2 === 0 ? "Agencia" : "Cliente",
          text: "Arrancamos la propuesta. Pendiente de feedback.",
          createdAt
        }
      ],
      createdAt,
      updatedAt: createdAt
    } satisfies Post;
  });
}

function createSeedEvents(baseDate: Date) {
  const month = baseDate.getMonth();
  const year = baseDate.getFullYear();
  const dates = [1, 5, 13, 19, 23];
  return dates.map((day, index) => {
    const createdAt = nowIso();
    return {
      id: makeId(),
      date: toISODate(new Date(year, month, day)),
      title: `Evento ${index + 1}`,
      note: index % 2 === 0 ? "Fecha importante" : undefined,
      channels: [],
      axis: undefined,
      status: "no_iniciado",
      chat: [],
      createdAt,
      updatedAt: createdAt
    } satisfies EventItem;
  });
}

function createSeedPaid(baseDate: Date, client: Client) {
  const month = baseDate.getMonth();
  const year = baseDate.getFullYear();
  const dates = [4, 9, 18, 26];
  return dates.map((day, index) => {
    const createdAt = nowIso();
    const startDate = toISODate(new Date(year, month, day));
    return {
      id: makeId(),
      startDate,
      endDate: startDate,
      title: `Pauta ${index + 1}`,
      status: "no_iniciado",
      axis: client.axes[index % client.axes.length]?.id,
      chat: [],
      createdAt,
      updatedAt: createdAt,
      paidChannels: [client.paidChannels[index % client.paidChannels.length] ?? ""].filter(
        Boolean
      ),
      paidContent: "Campana paga",
      investmentAmount: 0,
      investmentCurrency: "ARS"
    } satisfies PaidItem;
  });
}

export function createSeedData(baseDate = new Date()): AppData {
  const demoAxes: Axis[] = [
    { id: "eje-a", name: "Eje A", color: AXIS_COLORS[0] },
    { id: "eje-b", name: "Eje B", color: AXIS_COLORS[1] },
    { id: "eje-c", name: "Eje C", color: AXIS_COLORS[2] }
  ];
  const demoClient: Client = {
    id: "mtdm",
    name: "mtdm",
    channels: ["Instagram", "LinkedIn", "Sitio Web"],
    paidChannels: [],
    enablePaid: false,
    axes: demoAxes
  };

  return {
    version: DATA_VERSION,
    activeClientId: demoClient.id,
    clients: [demoClient],
    postsByClient: {
      [demoClient.id]: createSeedPosts(baseDate, demoClient)
    },
    eventsByClient: {
      [demoClient.id]: createSeedEvents(baseDate)
    },
    paidByClient: {
      [demoClient.id]: []
    }
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") {
    return createSeedData();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.version || parsed.version !== DATA_VERSION) {
      const seed = createSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return normalizeData(parsed);
  } catch {
    const seed = createSeedData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveData(next: AppData) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function normalizeEvent(event: EventItem): EventItem {
  const createdAt = event.createdAt ?? nowIso();
  return {
    ...event,
    channels: event.channels ?? [],
    axis: event.axis ?? undefined,
    status: normalizeStatus(event.status),
    chat: event.chat ?? [],
    createdAt,
    updatedAt: event.updatedAt ?? createdAt
  };
}

function normalizePaid(item: PaidItem): PaidItem {
  const createdAt = item.createdAt ?? nowIso();
  const fallbackDate = toISODate(new Date());
  const startDate =
    (item as PaidItem & { date?: string }).startDate ??
    (item as PaidItem & { date?: string }).date ??
    fallbackDate;
  const endDateRaw =
    (item as PaidItem & { endDate?: string }).endDate ??
    (item as PaidItem & { date?: string }).date ??
    startDate;
  const endDate = endDateRaw && endDateRaw >= startDate ? endDateRaw : startDate;
  return {
    ...item,
    startDate,
    endDate,
    paidChannels: item.paidChannels ?? [],
    paidContent: item.paidContent ?? "",
    investmentAmount: item.investmentAmount ?? 0,
    investmentCurrency: item.investmentCurrency ?? "ARS",
    status: normalizeStatus(item.status),
    chat: item.chat ?? [],
    axis: item.axis ?? undefined,
    createdAt,
    updatedAt: item.updatedAt ?? createdAt
  };
}

function normalizeStatus(status: string | undefined): PostStatus {
  if (status && VALID_STATUSES.includes(status as PostStatus)) {
    return status as PostStatus;
  }
  return "no_iniciado";
}

function normalizeAxes(axes: Client["axes"]) {
  return axes.map((axis, index) => {
    if (typeof axis === "string") {
      return {
        id: makeId(),
        name: axis,
        color: AXIS_COLORS[index % AXIS_COLORS.length]
      } satisfies Axis;
    }
    return {
      ...axis,
      color: axis.color ?? AXIS_COLORS[index % AXIS_COLORS.length]
    };
  });
}

function normalizeData(data: AppData): AppData {
  const nextClients = data.clients.map((client) => {
    const nextAxes = normalizeAxes(client.axes ?? []);
    const enablePaid = client.enablePaid ?? false;
    const paidChannels =
      enablePaid && client.paidChannels && client.paidChannels.length > 0
        ? client.paidChannels
        : enablePaid
          ? PAID_CHANNEL_DEFAULTS
          : [];
    return {
      ...client,
      axes: nextAxes,
      paidChannels,
      enablePaid
    };
  });
  const nextEventsByClient: Record<string, EventItem[]> = {};
  Object.entries(data.eventsByClient ?? {}).forEach(([clientId, items]) => {
    nextEventsByClient[clientId] = (items ?? []).map((event) => normalizeEvent(event));
  });
  const nextPaidByClient: Record<string, PaidItem[]> = {};
  Object.entries(data.paidByClient ?? {}).forEach(([clientId, items]) => {
    nextPaidByClient[clientId] = (items ?? []).map((item) => normalizePaid(item));
  });

  const axisNameByClient: Record<string, Record<string, string>> = {};
  nextClients.forEach((client) => {
    axisNameByClient[client.id] = client.axes.reduce<Record<string, string>>((acc, axis) => {
      acc[axis.name] = axis.id;
      return acc;
    }, {});
  });

  const nextPostsByClient: Record<string, Post[]> = {};
  Object.entries(data.postsByClient ?? {}).forEach(([clientId, items]) => {
    const axisMap = axisNameByClient[clientId] ?? {};
    nextPostsByClient[clientId] = (items ?? []).map((post) => {
      const axisId = post.axis && axisMap[post.axis] ? axisMap[post.axis] : post.axis;
      return { ...post, axis: axisId, status: normalizeStatus(post.status) };
    });
  });

  Object.entries(nextEventsByClient).forEach(([clientId, items]) => {
    const axisMap = axisNameByClient[clientId] ?? {};
    nextEventsByClient[clientId] = items.map((event) => {
      const axisId = event.axis && axisMap[event.axis] ? axisMap[event.axis] : event.axis;
      return { ...event, axis: axisId };
    });
  });
  Object.entries(nextPaidByClient).forEach(([clientId, items]) => {
    const axisMap = axisNameByClient[clientId] ?? {};
    nextPaidByClient[clientId] = items.map((item) => {
      const axisId = item.axis && axisMap[item.axis] ? axisMap[item.axis] : item.axis;
      return { ...item, axis: axisId };
    });
  });
  return {
    ...data,
    clients: nextClients,
    postsByClient: nextPostsByClient,
    eventsByClient: nextEventsByClient,
    paidByClient: nextPaidByClient
  };
}

export function ensureClientRecord<T>(
  record: Record<string, T[]>,
  clientId: string
) {
  if (!record[clientId]) {
    return { ...record, [clientId]: [] };
  }
  return record;
}

export function addPost(clientId: string, date: string): Post {
  const createdAt = nowIso();
  return {
    id: makeId(),
    date,
    title: "",
    channels: [],
    status: "no_iniciado",
    chat: [],
    createdAt,
    updatedAt: createdAt
  };
}

export function addEvent(clientId: string, date: string): EventItem {
  const createdAt = nowIso();
  return {
    id: makeId(),
    date,
    title: "",
    note: "",
    channels: [],
    axis: undefined,
    status: "no_iniciado",
    chat: [],
    createdAt,
    updatedAt: createdAt
  };
}

export function addPaid(clientId: string, startDate: string, endDate?: string): PaidItem {
  const createdAt = nowIso();
  const safeEnd = endDate && endDate >= startDate ? endDate : startDate;
  return {
    id: makeId(),
    startDate,
    endDate: safeEnd,
    title: "",
    status: "no_iniciado",
    axis: undefined,
    chat: [],
    createdAt,
    updatedAt: createdAt,
    paidChannels: [],
    paidContent: "",
    investmentAmount: 0,
    investmentCurrency: "ARS"
  };
}

export function addChatMessage(text: string, author: ChatMessage["author"]): ChatMessage {
  return {
    id: makeId(),
    author,
    text,
    createdAt: nowIso()
  };
}
