import { expenseDate, type Transaction } from "./finance";
import type { EntryContext } from "./expense-language";
import { resolveEntry } from "./patterns";

export function previewBatch(text: string, date: string, history: Transaction[], learning = true, context: EntryContext = {}) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const timestamp = expenseDate(date);
  if (!timestamp) return { entries: [], errors: ["Choose a valid date up to today."] };
  if (!lines.length || lines.length > 25) return { entries: [], errors: ["Add between 1 and 25 expenses, one per line."] };
  const entries: (NonNullable<ReturnType<typeof resolveEntry>> & { date: string })[] = [];
  const errors: string[] = [];
  lines.forEach((line, index) => {
    const entry = resolveEntry(line, history, learning, new Date(), { ...context, allowTime: false });
    if (entry) entries.push({ ...entry, date: entry.date ?? timestamp });
    else errors.push(`Line ${index + 1}: start with an amount, such as 95 monster.`);
  });
  return { entries, errors };
}
