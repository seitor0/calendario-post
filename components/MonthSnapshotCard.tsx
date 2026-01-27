"use client";

import { useState } from "react";
import type { EventItem, PaidItem, Post, PostStatus } from "@/lib/types";
import { formatMonthYear, isSameYearMonth, toISODate } from "@/lib/date";

type MonthSnapshotCardProps = {
  viewDate: Date;
  posts: Post[];
  events: EventItem[];
  paid: PaidItem[];
  enablePaid?: boolean;
};

const statusLabels: Record<PostStatus, string> = {
  no_iniciado: "Publicaciones no iniciadas",
  en_proceso: "Publicaciones en proceso",
  esperando_feedback: "Publicaciones esperando feedback",
  aprobado: "Publicaciones aprobadas",
  publicada: "Publicaciones publicadas"
};

export default function MonthSnapshotCard({
  viewDate,
  posts,
  events,
  paid,
  enablePaid = false
}: MonthSnapshotCardProps) {
  const [open, setOpen] = useState(false);
  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const postsInMonth = posts.filter((post) => isSameYearMonth(post.date, year, monthIndex));
  const eventsInMonth = events.filter((event) => isSameYearMonth(event.date, year, monthIndex));
  const monthStart = toISODate(new Date(year, monthIndex, 1));
  const monthEnd = toISODate(new Date(year, monthIndex + 1, 0));
  const paidInMonth = paid.filter((item) => {
    const safeEnd = item.endDate >= item.startDate ? item.endDate : item.startDate;
    return item.startDate <= monthEnd && safeEnd >= monthStart;
  });

  const statusCounts = postsInMonth.reduce<Record<PostStatus, number>>(
    (acc, post) => {
      acc[post.status] = (acc[post.status] ?? 0) + 1;
      return acc;
    },
    {
      no_iniciado: 0,
      en_proceso: 0,
      esperando_feedback: 0,
      aprobado: 0,
      publicada: 0
    }
  );

  return (
    <section className="rounded-2xl bg-white/70 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Resumen del mes</p>
          <p className="text-xs font-medium text-ink/60">{formatMonthYear(viewDate)}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-ink/10 px-3 py-1 text-[11px] font-semibold text-ink/70 transition hover:-translate-y-0.5 hover:shadow-soft"
        >
          {open ? "Ocultar resumen" : "Ver resumen"}
        </button>
      </div>
      {!open ? (
        <div className="mt-4 text-xs text-ink/70">
          Eventos: {String(eventsInMonth.length).padStart(2, "0")} · No iniciadas:{" "}
          {String(statusCounts.no_iniciado).padStart(2, "0")} · En proceso:{" "}
          {String(statusCounts.en_proceso).padStart(2, "0")}
        </div>
      ) : (
        <div className="mt-4 space-y-2 text-xs text-ink/70">
          <div className="flex items-center justify-between">
            <span>Eventos importantes este mes</span>
            <span className="text-sm font-semibold text-ink">
              {String(eventsInMonth.length).padStart(2, "0")}
            </span>
          </div>
          {(Object.keys(statusLabels) as PostStatus[]).map((status) => (
            <div key={status} className="flex items-center justify-between">
              <span>{statusLabels[status]}</span>
              <span className="text-sm font-semibold text-ink">
                {String(statusCounts[status]).padStart(2, "0")}
              </span>
            </div>
          ))}
          {enablePaid ? (
            <>
              <div className="flex items-center justify-between">
                <span>Pauta este mes</span>
                <span className="text-sm font-semibold text-ink">
                  {String(paidInMonth.length).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inversion total ARS</span>
                <span className="text-sm font-semibold text-ink">
                  {String(
                    paidInMonth
                      .filter((item) => item.investmentCurrency === "ARS")
                      .reduce((acc, item) => acc + item.investmentAmount, 0)
                  ).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Inversion total USD</span>
                <span className="text-sm font-semibold text-ink">
                  {String(
                    paidInMonth
                      .filter((item) => item.investmentCurrency === "USD")
                      .reduce((acc, item) => acc + item.investmentAmount, 0)
                  ).padStart(2, "0")}
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
