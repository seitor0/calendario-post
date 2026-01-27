"use client";

import { useMemo } from "react";
import type { Axis, EventItem, PaidItem, Post } from "@/lib/types";
import { getMonthMatrix, isSameMonth, toISODate } from "@/lib/date";
import DayCell from "@/components/DayCell";

type CalendarMonthProps = {
  viewDate: Date;
  selectedDate: string;
  posts: Post[];
  events: EventItem[];
  paid: PaidItem[];
  axes: Axis[];
  dayUpdates?: Record<string, boolean>;
  onSelectDate: (date: string) => void;
  onQuickAdd: (date: string) => void;
};

const weekLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function groupByDate<T extends { date: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    acc[item.date] = acc[item.date] ? [...acc[item.date], item] : [item];
    return acc;
  }, {});
}

function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildPaidByDateMap(paid: PaidItem[], viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const map: Record<string, PaidItem[]> = {};

  paid.forEach((item) => {
    const start = parseISODate(item.startDate);
    const end = parseISODate(item.endDate && item.endDate >= item.startDate ? item.endDate : item.startDate);
    const current = new Date(start);
    while (current <= end) {
      if (current >= monthStart && current <= monthEnd) {
        const key = toISODate(current);
        map[key] = map[key] ? [...map[key], item] : [item];
      }
      current.setDate(current.getDate() + 1);
    }
  });

  return map;
}

export default function CalendarMonth({
  viewDate,
  selectedDate,
  posts,
  events,
  paid,
  axes,
  dayUpdates = {},
  onSelectDate,
  onQuickAdd
}: CalendarMonthProps) {
  const matrix = getMonthMatrix(viewDate.getFullYear(), viewDate.getMonth());
  const postsByDate = useMemo(() => groupByDate(posts), [posts]);
  const eventsByDate = useMemo(() => groupByDate(events), [events]);
  const paidByDate = useMemo(() => buildPaidByDateMap(paid, viewDate), [paid, viewDate]);

  return (
    <section className="rounded-xl bg-white/70 p-4 shadow-soft">
      <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-ink/60">
        {weekLabels.map((label) => (
          <div key={label} className="px-2 py-1 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {matrix.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="contents">
            {week.map((date) => {
              const dateKey = toISODate(date);
              return (
                <DayCell
                  key={dateKey}
                  date={date}
                  isCurrentMonth={isSameMonth(
                    date,
                    viewDate.getMonth(),
                    viewDate.getFullYear()
                  )}
                  isSelected={selectedDate === dateKey}
                  posts={postsByDate[dateKey] ?? []}
                  events={eventsByDate[dateKey] ?? []}
                  paid={paidByDate[dateKey] ?? []}
                  axes={axes}
                  hasUpdates={dayUpdates[dateKey] ?? false}
                  onSelect={onSelectDate}
                  onDoubleClick={onQuickAdd}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
