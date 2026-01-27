import type { Axis, EventItem, PaidItem, Post, PostStatus } from "@/lib/types";
import { toISODate } from "@/lib/date";

const statusColors: Record<PostStatus, string> = {
  no_iniciado: "bg-slate-300",
  en_proceso: "bg-violet",
  esperando_feedback: "bg-peach",
  aprobado: "bg-skydeep",
  publicada: "bg-emerald-600"
};

type DayCellProps = {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  posts: Post[];
  events: EventItem[];
  paid: PaidItem[];
  axes: Axis[];
  hasUpdates?: boolean;
  onSelect: (date: string) => void;
  onDoubleClick: (date: string) => void;
};

function getAxisDotColor(axisId: string | undefined, axes: Axis[]) {
  const axis = axes.find((item) => item.id === axisId);
  return axis?.color ?? "#CBD5F5";
}

export default function DayCell({
  date,
  isCurrentMonth,
  isSelected,
  posts,
  events,
  paid,
  axes,
  hasUpdates = false,
  onSelect,
  onDoubleClick
}: DayCellProps) {
  const dateKey = toISODate(date);
  const visibleItems = [...posts, ...paid].slice(0, 3);
  const overflowCount = posts.length + paid.length - visibleItems.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      onDoubleClick={() => onDoubleClick(dateKey)}
      className={`group relative flex h-28 flex-col rounded-xl border border-white/80 px-2 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-skydeep/50 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-skydeep ${
        isCurrentMonth ? "bg-sky" : "bg-skysoft/70 text-ink/40"
      } ${isSelected ? "ring-2 ring-skydeep shadow-soft" : ""}`}
    >
      {hasUpdates ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
      ) : null}
      <span className="ml-auto text-xs font-semibold text-ink/50 group-hover:text-ink">
        {date.getDate()}
      </span>
      <div className="mt-2 flex flex-1 flex-col gap-1">
        {visibleItems.map((item) => (
          <span
            key={item.id}
            title={`${"paidChannels" in item ? "Pauta" : "Publicacion"}: ${
              item.title || "Sin titulo"
            } | Estado: ${String(item.status).replace(/_/g, " ")} | Eje: ${
              axes.find((axis) => axis.id === item.axis)?.name || "Sin eje"
            }`}
            className="flex items-center gap-1"
          >
            {"paidChannels" in item ? (
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-white">
                $
              </span>
            ) : (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getAxisDotColor(item.axis, axes) }}
              />
            )}
            <span className={`h-3 flex-1 rounded-full ${statusColors[item.status]}`} />
          </span>
        ))}
        {overflowCount > 0 ? (
          <span className="text-[10px] font-semibold text-ink/60">+{overflowCount}</span>
        ) : null}
      </div>
      {events.length > 0 ? (
        <div className="mt-1 h-3 w-full rounded-full bg-red-500" />
      ) : null}
    </button>
  );
}
