"use client";
import { useState, type FormEvent } from "react";
import { localDateInput, money, totalExpenseCents, type Transaction } from "@/lib/finance";
import { type PaymentAccount } from "@/lib/accounts";
import { previewBatch } from "@/lib/batch-entry";

export function BatchCatchUp({ history, accounts, defaultAccountId, learning, onSave }: {
  history: Transaction[]; accounts: PaymentAccount[]; defaultAccountId: string; learning: boolean; onSave: (entries: Transaction[]) => void;
}) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(localDateInput());
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [showPreview, setShowPreview] = useState(false);
  const payment = accounts.some((item) => item.id === accountId && !item.archived) ? accountId : "";
  const preview = previewBatch(text, date, history, learning, { accounts, accountId: payment || undefined });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setShowPreview(true);
    if (preview.errors.length) return;
  }
  function add() {
    if (preview.errors.length || !preview.entries.length) return;
    onSave(preview.entries.map((item) => ({ ...item, id: crypto.randomUUID(), accountId: item.accountId ?? (payment || undefined) })));
    setText(""); setShowPreview(false);
  }
  return <details className="batch-catch-up"><summary>Log several at once <span>One line per expense</span></summary>
    <form onSubmit={submit} noValidate>
      <div className="batch-fields"><label>Expense date<input type="date" max={localDateInput()} value={date} onChange={(event) => { setDate(event.target.value); setShowPreview(false); }} /></label><div className="batch-account"><label htmlFor="batch-account">Batch paid from</label><select id="batch-account" value={payment} onChange={(event) => { setAccountId(event.target.value); setShowPreview(false); }}><option value="">Unassigned</option>{accounts.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
      <label htmlFor="batch-lines">Expenses</label><textarea id="batch-lines" value={text} maxLength={4000} rows={4} placeholder={'95 monster\n30 jeep\n180 lunch'} onChange={(event) => { setText(event.target.value); setShowPreview(false); }} />
      {showPreview && preview.errors.length > 0 && <ul role="alert" className="field-error">{preview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}
      {showPreview && !preview.errors.length ? <section className="batch-preview" aria-label="Expenses to add"><ul>{preview.entries.map((item, index) => <li key={index}><span>{item.name}{item.needsReview && <small> · Needs review</small>}</span><strong>{money(item.amount)}</strong></li>)}</ul><p>{preview.entries.length} expenses · {money(totalExpenseCents(preview.entries) / 100)}</p><button className="primary-button" type="button" onClick={add}>Add {preview.entries.length} expenses</button></section> : <button className="secondary-button" type="submit">Review expenses</button>}
    </form>
  </details>;
}
