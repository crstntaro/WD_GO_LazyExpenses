
export type Category =
  | "Food & Drinks"
  | "Transport"
  | "Shopping"
  | "Groceries"
  | "Bills & Utilities"
  | "Health"
  | "Home"
  | "Leisure"
  | "Other";

export type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  source?: "manual" | "confirmed" | "suggested" | "amount-only";
  needsReview?: boolean;
  accountId?: string;
};

// Keep this key unchanged to preserve existing transactions.
export const STORAGE_KEY = "whereditgo-transactions-v1";

export const STARTING_BALANCE = 2500;

export const CATEGORIES: Category[] = [
  "Food & Drinks",
  "Transport",
  "Shopping",
  "Groceries",
  "Bills & Utilities",
  "Health",
  "Home",
  "Leisure",
  "Other",
];

export function totalExpenseCents(transactions: Pick<Transaction, "amount">[]): number {
  return transactions.reduce(
    (sum, transaction) => sum + Math.round(transaction.amount * 100),
    0,
  );
}

export function money(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

export function parseAmount(input: string): number | null {
  const value = input.trim().replace(/^₱\s*/, "");
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount <= 99999999 ? amount : null;
}

export function localDateInput(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function expenseDate(input: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input) || input > localDateInput(now)) return null;
  const date = new Date(`${input}T12:00:00`);
  if (Number.isNaN(date.getTime()) || localDateInput(date) !== input) return null;
  return date.toISOString();
}

export function needsDetails(transaction: Transaction): boolean {
  return transaction.needsReview === true || transaction.source === "suggested" || transaction.source === "amount-only";
}

export function categoryFor(name: string): Category {
  if (/\b(grocer(?:y|ies)|supermarket|palengke|pamalengke)\b/i.test(name)) return "Groceries";
  if (/\b(internet|electricity|meralco|water bill|wifi|phone bill|load|subscription|kuryente|tubig|gasul)\b/i.test(name)) return "Bills & Utilities";
  if (/\b(doctor|medicine|pharmacy|hospital|dentist|checkup|vitamins|gamot)\b/i.test(name)) return "Health";
  if (/\b(rent|upa|furniture|repair|household)\b/i.test(name)) return "Home";
  if (/\b(movie|cinema|game|concert|netflix|spotify)\b/i.test(name)) return "Leisure";
  if (
    /\b(coffee|kape|pagkain|merienda|almusal|tanghalian|hapunan|food|meal|lunch|dinner|breakfast|monster|drink|snack|milk\s?tea|matcha|rice|burger|pizza|jollibee|mcdo|chowking)\b/i.test(
      name
    )
  ) {
    return "Food & Drinks";
  }

  if (
    /\b(grab|pamasahe|tricycle|trike|jeep|jeepney|bus|train|fare|angkas|move\s?it|joyride|lrt|mrt|toll|gas|fuel)\b/i.test(
      name
    )
  ) {
    return "Transport";
  }

  if (
    /\b(shoes|shirt|clothes|shop|shopping|lazada|shopee|uniqlo|keyboard|mouse|case)\b/i.test(
      name
    )
  ) {
    return "Shopping";
  }

  return "Other";
}

export function parseQuickEntry(
  input: string
): { amount: number; name: string } | null {
  const match = input
    .trim()
    .match(/^(?:₱\s*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s+(.+)$/);

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  const name = match[2].trim().replace(/\s+/g, " ");

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 99999999 ||
    !name
  ) {
    return null;
  }

  return { amount, name };
}

export function isTransaction(
  value: unknown
): value is Transaction {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const t = value as Partial<Transaction>;

  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.category === "string" &&
    typeof t.amount === "number" &&
    Number.isFinite(t.amount) &&
    t.amount > 0 &&
    typeof t.date === "string" &&
    !Number.isNaN(Date.parse(t.date))
  );
}

export function dateLabel(date: string): string {
  const candidate = new Date(date);
  const now = new Date();

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(candidate, now)) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (sameDay(candidate, yesterday)) {
    return "Yesterday";
  }

  return candidate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}
