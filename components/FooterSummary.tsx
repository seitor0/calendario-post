"use client";

import { useMemo } from "react";
import type { Axis, Post } from "@/lib/types";
import { formatMonthYear } from "@/lib/date";

type FooterSummaryProps = {
  viewDate: Date;
  onChangeMonth: (date: Date) => void;
  posts: Post[];
  channels: string[];
  axes: Axis[];
};

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

function getYearOptions(baseYear: number) {
  return [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
}

export default function FooterSummary({
  viewDate,
  onChangeMonth,
  posts,
  channels,
  axes
}: FooterSummaryProps) {
  const monthPosts = useMemo(() => {
    return posts.filter((post) => {
      const date = new Date(`${post.date}T00:00:00`);
      return date.getMonth() === viewDate.getMonth() && date.getFullYear() === viewDate.getFullYear();
    });
  }, [posts, viewDate]);

  const channelCounts = useMemo(() => {
    const tally: Record<string, number> = {};
    channels.forEach((channel) => {
      tally[channel] = 0;
    });
    monthPosts.forEach((post) => {
      post.channels.forEach((channel) => {
        tally[channel] = (tally[channel] ?? 0) + 1;
      });
    });
    return tally;
  }, [monthPosts, channels]);

  const axisCounts = useMemo(() => {
    const tally: Record<string, number> = {};
    axes.forEach((axis) => {
      tally[axis.id] = 0;
    });
    monthPosts.forEach((post) => {
      if (post.axis) {
        tally[post.axis] = (tally[post.axis] ?? 0) + 1;
      }
    });
    return tally;
  }, [monthPosts, axes]);

  const totalAxis = Object.values(axisCounts).reduce((acc, value) => acc + value, 0) || 1;

  const handlePrev = () => {
    onChangeMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNext = () => {
    onChangeMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <section className="mt-4 rounded-xl bg-white/70 p-4 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs font-medium text-ink/60">Filtro de fecha</p>
            <p className="text-lg font-semibold text-ink">{formatMonthYear(viewDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold"
            >
              Siguiente
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={viewDate.getMonth()}
              onChange={(event) =>
                onChangeMonth(new Date(viewDate.getFullYear(), Number(event.target.value), 1))
              }
              className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs"
            >
              {months.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={viewDate.getFullYear()}
              onChange={(event) =>
                onChangeMonth(new Date(Number(event.target.value), viewDate.getMonth(), 1))
              }
              className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs"
            >
              {getYearOptions(viewDate.getFullYear()).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs font-medium text-ink/60">Cantidad de publicaciones</p>
            <p className="text-2xl font-semibold text-ink">{monthPosts.length}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs font-medium text-ink/60">Publicaciones por plataforma</p>
            <div className="mt-2 space-y-1 text-xs">
              {channels.length === 0 ? (
                <p className="text-ink/50">Defini canales en Settings.</p>
              ) : (
                channels.map((channel) => (
                  <div key={channel} className="flex items-center justify-between">
                    <span>{channel}</span>
                    <span className="font-semibold">{channelCounts[channel] ?? 0}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs font-medium text-ink/60">Promedio por ejes</p>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
              {axes.map((axis, index) => {
                const value = axisCounts[axis.id] ?? 0;
                const width = `${Math.round((value / totalAxis) * 100)}%`;
                const colors = ["bg-violet", "bg-mint", "bg-skydeep", "bg-peach"];
                return (
                  <span
                    key={axis.id}
                    style={{ width }}
                    className={`${colors[index % colors.length]} h-full`}
                  />
                );
              })}
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-ink/70">
              {axes.map((axis) => (
                <div key={axis.id} className="flex items-center justify-between">
                  <span>{axis.name}</span>
                  <span>{axisCounts[axis.id] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
