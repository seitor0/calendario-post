export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(date: Date) {
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthMatrix(year: number, month: number, weekStartsOnMonday = true) {
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay();
  const offset = weekStartsOnMonday
    ? (firstWeekDay === 0 ? 6 : firstWeekDay - 1)
    : firstWeekDay;

  const start = new Date(year, month, 1 - offset);
  const weeks: Date[][] = [];
  const current = new Date(start);

  for (let w = 0; w < 6; w += 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function isSameMonth(date: Date, month: number, year: number) {
  return date.getMonth() === month && date.getFullYear() === year;
}

export function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameYearMonth(isoDate: string, year: number, monthIndex: number) {
  const [valueYear, valueMonth, valueDay] = isoDate.split("-").map(Number);
  if (!valueYear || !valueMonth || !valueDay) {
    return false;
  }
  return valueYear === year && valueMonth === monthIndex + 1;
}

export function isDateInRange(dayISO: string, startISO: string, endISO: string) {
  if (!dayISO || !startISO) {
    return false;
  }
  const safeEnd = endISO && endISO >= startISO ? endISO : startISO;
  return dayISO >= startISO && dayISO <= safeEnd;
}

export function clampEndDate(startISO: string, endISO: string) {
  if (!endISO || endISO < startISO) {
    return startISO;
  }
  return endISO;
}
