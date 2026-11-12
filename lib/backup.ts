import { capitalizeExpense } from "./expense-language";
import { isTransaction, localDateInput, type Transaction } from "./finance";
import { isSetup } from "./setup-store";
import { accountLabel, type PaymentAccount } from "./accounts";

export type ImportPlan = { entries: Transaction[]; accounts: PaymentAccount[]; skipped: number; conflicts: number; sourceCount: number };
export function prepareImport(raw: string, current: Transaction[], accounts: PaymentAccount[], makeId = () => crypto.randomUUID()): ImportPlan {
  if (raw.length > 5 * 1024 * 1024) throw new Error("Choose a backup smaller than 5 MB.");
  let backup;
  try { backup = JSON.parse(raw); } catch { throw new Error("This file isn't valid JSON. Your data hasn't changed."); }
  if (!backup || backup.version !== 1 || !Array.isArray(backup.transactions) || backup.transactions.length > 10000 ||
    !backup.transactions.every(isTransaction) || !isSetup(backup.setup) || new Set(backup.transactions.map((item: Transaction) => item.id)).size !== backup.transactions.length ||
    backup.transactions.some((item: Transaction) => item.accountId !== undefined && typeof item.accountId !== "string")) {
    throw new Error("This isn't a supported Where’d It Go? backup. Your data hasn't changed.");
  }
  const existing = new Map(current.map((item) => [item.id, item]));
  const mapped = new Map<string, string>();
  const merged = [...accounts];
  let sourceCount = 0;
  for (const account of (backup.setup.accounts ?? []) as PaymentAccount[]) {
    const match = merged.find((item) => item.id === account.id);
    if (!match) { merged.push(account); sourceCount++; }
    else if (match.name !== account.name || match.kind !== account.kind) {
      // A different source must never relabel local history.
      const sameSource = merged.find((item) => item.name === account.name && item.kind === account.kind);
      if (sameSource) mapped.set(account.id, sameSource.id);
      else if (backup.transactions.some((item: Transaction) => item.accountId === account.id && !existing.has(item.id))) {
        const id = makeId();
        mapped.set(account.id, id); merged.push({ ...account, id }); sourceCount++;
      }
    }
  }
  if (merged.length > 50) throw new Error("This import would exceed 50 payment sources. Nothing has changed.");
  let skipped = 0, conflicts = 0;
  const entries: Transaction[] = [];
  for (const item of backup.transactions as Transaction[]) {
    const match = existing.get(item.id);
    if (match) {
      skipped++;
      const keys = new Set([...Object.keys(match), ...Object.keys(item)]);
      if ([...keys].some((key) => JSON.stringify((match as unknown as Record<string, unknown>)[key]) !== JSON.stringify((item as unknown as Record<string, unknown>)[key]))) conflicts++;
    } else entries.push({ ...item, ...(item.accountId && mapped.has(item.accountId) ? { accountId: mapped.get(item.accountId) } : {}) });
  }
  return { entries, accounts: merged, skipped, conflicts, sourceCount };
}
function cell(value: string | number) {
  const text = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function entriesCSV(items: Transaction[], accounts: PaymentAccount[]) {
  const rows = [["Date", "Expense", "Amount (PHP)", "Category", "Paid from", "Review status"], ...items.map((item) => [localDateInput(new Date(item.date)), capitalizeExpense(item.name), item.amount.toFixed(2), item.category, accountLabel(item.accountId, accounts), item.needsReview || item.source === "suggested" || item.source === "amount-only" ? "Needs review" : "Recorded"])];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
