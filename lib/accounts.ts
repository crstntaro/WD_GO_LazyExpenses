import { totalExpenseCents, type Transaction } from "./finance";
export const ACCOUNT_KINDS = ["cash", "ewallet", "bank", "card"] as const;
export type AccountKind = typeof ACCOUNT_KINDS[number];
export type PaymentAccount = { id: string; name: string; kind: AccountKind; archived?: boolean; provider?: string; balanceCents?: number; balanceRecordedCents?: number };
export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = { cash: "Cash", ewallet: "E-wallet", bank: "Bank / debit", card: "Credit card" };

export function validAccounts(value: unknown): value is PaymentAccount[] {
  if (!Array.isArray(value) || value.length > 50) return false;
  const ids = new Set<string>();
  return value.every((account) => {
    if (!account || typeof account !== "object" || typeof account.id !== "string" || !account.id || account.id.length > 100 ||
      typeof account.name !== "string" || !account.name.trim() || account.name.length > 40 ||
      !ACCOUNT_KINDS.includes(account.kind) || (account.archived !== undefined && typeof account.archived !== "boolean") || ids.has(account.id) ||
      (account.provider !== undefined && !["gcash", "maya", "bpi", "bdo", "metrobank", "other"].includes(account.provider)) ||
      (account.balanceCents !== undefined && (!Number.isSafeInteger(account.balanceCents) || Math.abs(account.balanceCents) > 9999999900 || (account.kind === "card" && account.balanceCents < 0))) ||
      (account.balanceRecordedCents !== undefined && (!Number.isSafeInteger(account.balanceRecordedCents) || account.balanceRecordedCents < 0)) ||
      (account.balanceRecordedCents !== undefined && account.balanceCents === undefined)) return false;
    ids.add(account.id);
    return true;
  });
}

export function accountLabel(id: string | undefined, accounts: PaymentAccount[] = []) {
  if (!id) return "Unassigned";
  const account = accounts.find((item) => item.id === id);
  return account ? `${account.name}${account.archived ? " (archived)" : ""}` : "Unavailable account";
}

export const PROVIDERS = { gcash: "GCash", maya: "Maya", bpi: "BPI", bdo: "BDO", metrobank: "Metrobank", other: "Other" } as const;
export type Provider = keyof typeof PROVIDERS;
export function accountProvider(account: PaymentAccount): Provider {
  if (account.provider && account.provider in PROVIDERS) return account.provider as Provider;
  const name = account.name.toLowerCase();
  return (["gcash", "maya", "bpi", "bdo", "metrobank"] as const).find((brand) => new RegExp(`\\b${brand}\\b`).test(name)) ?? "other";
}
export function accountSpentCents(account: PaymentAccount, items: Transaction[]) {
  return totalExpenseCents(items.filter((item) => item.accountId === account.id));
}
export function accountBalanceCents(account: PaymentAccount, items: Transaction[]) {
  if (account.balanceCents === undefined) return null;
  const delta = accountSpentCents(account, items) - (account.balanceRecordedCents ?? 0);
  return account.balanceCents + (account.kind === "card" ? delta : -delta);
}
