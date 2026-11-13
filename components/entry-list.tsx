import { categoryTone } from "@/lib/category-tone";
import { dateLabel, money, needsDetails, type Transaction } from "@/lib/finance";

import { capitalizeExpense } from "@/lib/expense-language";
import { accountLabel, type PaymentAccount } from "@/lib/accounts";

export function EntryList({ items, onEdit, onDelete, onConfirm, lastAddedId, suggestedNames, accounts = [], hideDates = false }: {
  items: Transaction[];
  onEdit: (item: Transaction) => void;
  onDelete?: (item: Transaction) => void;
  onConfirm?: (item: Transaction) => void;
  lastAddedId?: string | null;
  suggestedNames?: Map<string, string>;
  accounts?: PaymentAccount[];
  hideDates?: boolean;
}) {
  return <ul className="transaction-list">
    {items.map((item) => <li key={item.id} data-needs-review={needsDetails(item) || undefined} className={`transaction-row${lastAddedId === item.id ? " just-added" : ""}`}>
      <button className={`transaction-main${hideDates ? " date-hidden" : ""}`} type="button" onClick={() => onEdit(item)} aria-label={`Edit ${capitalizeExpense(item.name)}`}>
        {!hideDates && <time dateTime={item.date}>{dateLabel(item.date)}</time>}
        <span className="transaction-description"><strong>{capitalizeExpense(item.name)}</strong>
          <span><span className="transaction-category"><i className={`category-dot category-${categoryTone(item.category)}`} aria-hidden="true" />{item.category}</span> · {accountLabel(item.accountId, accounts)}{needsDetails(item) && <span className="entry-status"> · {item.source === "suggested" ? "Suggested" : suggestedNames?.has(item.id) ? `Maybe ${suggestedNames.get(item.id)}` : "Needs details"}</span>}</span>
        </span>
        <strong className="transaction-amount">−{money(item.amount)}</strong>
      </button>
      {onConfirm && (item.source === "suggested" || suggestedNames?.has(item.id)) && <button className="confirm-entry" type="button" onClick={() => onConfirm(item)} title={suggestedNames?.has(item.id) ? `Use ${suggestedNames.get(item.id)}` : `Confirm ${capitalizeExpense(item.name)}`} aria-label={suggestedNames?.has(item.id) ? `Use ${suggestedNames.get(item.id)}` : `Confirm ${capitalizeExpense(item.name)}`}>✓</button>}
      {onDelete && <button className="icon-button delete-entry" type="button" onClick={() => onDelete(item)} aria-label={`Remove ${capitalizeExpense(item.name)}`}>×</button>}
    </li>)}
  </ul>;
}
