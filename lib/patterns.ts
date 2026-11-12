import { categoryFor, type Transaction } from "./finance";
import { capitalizeExpense, learningHistory, parseExpenseText, type EntryContext } from "./expense-language";
export type Pattern = { name: string; category: string; amount: number; matches: number; total: number; reason?: "account" | "time" };
const normalized = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-PH");
function winner(amount: number, items: Transaction[], threshold: number, minimum = 1): Pattern | null {
  const names = new Map<string, { item: Transaction; count: number }>();
  for (const item of items) {
    const key = normalized(item.name), existing = names.get(key);
    if (existing) existing.count++; else names.set(key, { item, count: 1 });
  }
  const best = [...names.values()].sort((a, b) => b.count - a.count)[0];
  if (!best || best.count < minimum || best.count / items.length < threshold) return null;
  return { name: capitalizeExpense(best.item.name), category: best.item.category, amount, matches: best.count, total: items.length };
}
export function suggestExpense(amount: number, items: Transaction[], now = new Date(), context: EntryContext = {}): Pattern | null {
  const matches = learningHistory(items, now).filter((item) => Math.round(item.amount * 100) === Math.round(amount * 100)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 50);
  if (context.accountId) {
    const account = winner(amount, matches.filter((item) => item.accountId === context.accountId), .75, 2);
    if (account) return { ...account, reason: "account" };
  }
  const usual = winner(amount, matches, .7);
  if (usual) return usual;
  if (context.allowTime !== false && matches.length >= 4) {
    const time = winner(amount, matches.filter((item) => {
      const hour = new Date(item.date).getHours(), difference = Math.abs(hour - now.getHours());
      return Math.min(difference, 24 - difference) <= 2;
    }), .8, 3);
    if (time) return { ...time, reason: "time" };
  }
  return null;
}
export function usualExpenses(items: Transaction[], now = new Date(), context: EntryContext = {}): Pattern[] {
  const groups = new Map<number, Transaction[]>();
  for (const item of learningHistory(items, now).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
    const cents = Math.round(item.amount * 100), group = groups.get(cents) ?? [];
    if (group.length < 50) group.push(item);
    groups.set(cents, group);
  }
  return [...groups].map(([amount, group]) => suggestExpense(amount / 100, group, now, context)).filter((pattern): pattern is Pattern => pattern !== null).sort((a, b) => b.matches - a.matches).slice(0, 3);
}
export function resolveEntry(input: string, items: Transaction[], learning = true, now = new Date(), context: EntryContext = {}) {
  const parsed = parseExpenseText(input, now, context);
  if (!parsed) return null;
  const { amount, date, accountId } = parsed;
  const metadata = { ...(date ? { date } : {}), ...(accountId ? { accountId } : {}) };
  if (parsed.name) {
    const previous = learning ? learningHistory(items, now).filter((item) => normalized(item.name) === normalized(parsed.name)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] : undefined;
    return { ...metadata, amount, name: parsed.name, category: previous?.category ?? categoryFor(parsed.name), source: "manual" as const, needsReview: false };
  }
  const pattern = learning ? suggestExpense(amount, items, now, { ...context, accountId: accountId ?? context.accountId, allowTime: date ? false : context.allowTime }) : null;
  return pattern ? { ...metadata, amount, name: pattern.name, category: pattern.category, source: "suggested" as const, needsReview: true }
    : { ...metadata, amount, name: "Unlabeled expense", category: "Other", source: "amount-only" as const, needsReview: true };
}
