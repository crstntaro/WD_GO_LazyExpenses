import { expenseDate, localDateInput, parseAmount, type Transaction } from "./finance";
import type { PaymentAccount } from "./accounts";
export type EntryContext = { accountId?: string; accounts?: PaymentAccount[]; allowTime?: boolean };
export function capitalizeExpense(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("en-PH"));
}
export function parseExpenseText(input: string, now = new Date(), context: EntryContext = {}) {
  let text = input.normalize("NFKC").trim();
  if (!text || text.length > 300 || /[$€£]|\b(?:usd|eur|salary|received|refund|transfer|cash\s*in|cash\s*out|credit card payment|paid credit card)\b/i.test(text)) return null;
  let date: string | undefined;
  const dateWords = [...text.matchAll(/\b(yesterday|kahapon|today|ngayon)\b/gi)];
  if (dateWords.length > 1) return null;
  if (dateWords.length) {
    const yesterday = /yesterday|kahapon/i.test(dateWords[0][0]);
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - Number(yesterday));
    date = yesterday ? expenseDate(localDateInput(day), now) ?? undefined : now.toISOString();
    text = text.replace(/\b(yesterday|kahapon|today|ngayon)\b/i, " ").trim();
  }
  let accountId: string | undefined;
  const candidates = (context.accounts ?? []).filter((account) => !account.archived).map((account) => {
    const name = account.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { account, match: text.match(new RegExp(`\\s+(?:from|via|using)\\s+${name}\\s*$`, "i")) };
  }).filter((item) => item.match);
  if (candidates.length > 1) return null;
  if (candidates.length === 1) { accountId = candidates[0].account.id; text = text.slice(0, candidates[0].match!.index).trim(); }
  text = text.replace(/^(?:i\s+)?(?:spent|paid|bought|gumastos|nagbayad|bumili)(?:\s+ako)?\s+/i, "").replace(/\bPHP\s*(?=\d)/gi, "₱").trim();
  // Exactly one standalone amount: never guess between two purchases or a date's digits.
  const amounts = [...text.matchAll(/(?<![\p{L}\d.,+\-])(?:₱\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?k?(?![\p{L}\d.,])/giu)];
  if (amounts.length !== 1) return null;
  const match = amounts[0];
  const raw = match[0].replace(/^₱\s*/, "");
  const amount = /k$/i.test(raw) ? parseAmount(String(Number(raw.slice(0, -1).replace(/,/g, "")) * 1000)) : parseAmount(raw);
  if (amount === null) return null;
  const before = text.slice(0, match.index).trim();
  const after = text.slice(match.index! + match[0].length).trim();
  const name = `${before} ${after}`.trim().replace(/^(?:on|for|sa|para\s+sa)\s+/i, "").replace(/\s+(?:pesos?|PHP)$/i, "").trim();
  if (/^[+\-=]/.test(name) || /\d/.test(name.replace(/[\p{L}]\d+|\d+[\p{L}]/gu, "")) || /\b(?:tomorrow|bukas|last\s+week|next\s+week)\b/i.test(name)) return null;
  return { amount, name: name ? capitalizeExpense(name) : "", ...(date ? { date } : {}), ...(accountId ? { accountId } : {}) };
}
export function learningHistory(items: Transaction[], now: Date) {
  const cutoff = now.getTime() - 90 * 86400000;
  return items.filter((item) => item.needsReview !== true && item.source !== "suggested" && item.source !== "amount-only" && item.name.trim() && !/^unlabeled expense$/i.test(item.name.trim()) && Date.parse(item.date) >= cutoff && Date.parse(item.date) <= now.getTime());
}
