import { localDateInput, totalExpenseCents, type Transaction } from "./finance";
export function calendarMonth(month: string) {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(year, index - 1, 1);
  return { label: first.toLocaleDateString("en-PH", { month: "long", year: "numeric" }), offset: first.getDay(), days: new Date(year, index, 0).getDate() };
}
export function shiftMonth(month: string, offset: number) { const [year, index] = month.split("-").map(Number); return localDateInput(new Date(year, index - 1 + offset, 1)).slice(0, 7); }
export function calendarTotals(items: Transaction[]) {
  const days = new Map<string, number>();
  for (const item of items) { const day = localDateInput(new Date(item.date)); days.set(day, (days.get(day) ?? 0) + Math.round(item.amount * 100)); }
  return days;
}
export function monthEntries(items: Transaction[], month: string, today = localDateInput()) {
  return items.filter((item) => { const day = localDateInput(new Date(item.date)); return day.startsWith(month) && day <= today; });
}
export function averageDailyCents(items: Transaction[], month: string, today = localDateInput()) {
  const days = month === today.slice(0, 7) ? Number(today.slice(-2)) : calendarMonth(month).days;
  return Math.round(totalExpenseCents(items) / days);
}
