import { CATEGORIES, localDateInput, totalExpenseCents, type Transaction } from "./finance";

export type Period = "month" | "last-month" | "all" | "custom";
export type EntryFilters = { period: Period; category: string; account: string; search: string; from?: string; to?: string };
export function periodBounds(period: Period, now = new Date(), from = "", to = "") {
  const year = now.getFullYear(), month = now.getMonth();
  if (period === "month") return { from: localDateInput(new Date(year, month, 1)), to: localDateInput(now) };
  if (period === "last-month") return { from: localDateInput(new Date(year, month - 1, 1)), to: localDateInput(new Date(year, month, 0)) };
  return period === "custom" ? { from, to } : { from: "", to: "" };
}
export function categoryGroup(category: string) { return category.trim() || "Other"; }
export function knownCategories(items: Transaction[]) { return [...new Set<string>([...CATEGORIES, ...items.map((item) => categoryGroup(item.category))])]; }
export function filterEntries(items: Transaction[], filters: EntryFilters, now = new Date()) {
  const { from, to } = periodBounds(filters.period, now, filters.from, filters.to);
  const search = filters.search.trim().toLocaleLowerCase();
  return items.filter((item) => {
    const day = localDateInput(new Date(item.date));
    return (!from || day >= from) && (!to || day <= to) &&
      (filters.category === "All" || categoryGroup(item.category) === filters.category) &&
      (filters.account === "all" || (filters.account === "unassigned" ? !item.accountId : item.accountId === filters.account)) &&
      `${item.name} ${item.category} ${item.amount}`.toLocaleLowerCase().includes(search);
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
export function spendingBreakdown(items: Transaction[], key: "category" | "account") {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = key === "category" ? categoryGroup(item.category) : item.accountId || "unassigned";
    totals.set(label, (totals.get(label) ?? 0) + Math.round(item.amount * 100));
  }
  const total = totalExpenseCents(items);
  return [...totals].map(([id, cents]) => ({ id, cents, share: total ? cents / total * 100 : 0 })).sort((a, b) => b.cents - a.cents);
}
export function dayGroups(items: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const item of [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
    const day = localDateInput(new Date(item.date));
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }
  return [...groups].map(([day, entries]) => ({ day, entries, cents: totalExpenseCents(entries) }));
}
