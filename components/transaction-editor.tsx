"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { categoryFor, expenseDate, localDateInput, parseAmount, type Transaction } from "@/lib/finance";

import { capitalizeExpense } from "@/lib/expense-language";
import { knownCategories } from "@/lib/spending";
import { accountLabel, type PaymentAccount } from "@/lib/accounts";

export type ExpenseFields = Pick<Transaction, "name" | "amount" | "category" | "date" | "accountId">;

type Props = { transaction?: Transaction; history?: Transaction[]; accounts?: PaymentAccount[]; defaultAccountId?: string; onSave: (fields: ExpenseFields) => void; onClose: () => void; onDelete?: () => void };

export function TransactionEditor({ transaction, history = [], accounts = [], defaultAccountId, onSave, onClose, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(transaction?.source === "amount-only" ? "" : capitalizeExpense(transaction?.name ?? ""));
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(transaction?.category ?? "Other");
  const categories = knownCategories(history);
  const [customCategory, setCustomCategory] = useState(false);
  const [categoryPicked, setCategoryPicked] = useState(false);
  const [date, setDate] = useState(transaction ? localDateInput(new Date(transaction.date)) : localDateInput());
  const [accountId, setAccountId] = useState(transaction ? transaction.accountId ?? "" : defaultAccountId ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty("--dialog-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--dialog-top", `${(viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) / 2}px`);
    };
    resize();
    if (!dialog?.open) dialog?.showModal();
    dialog.querySelector<HTMLInputElement>("#edit-name")?.focus({ preventScroll: true });
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      dialog.close();
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = parseAmount(amount);
    const timestamp = expenseDate(date);
    if (!name.trim() || !category.trim() || value === null || !timestamp) {
      setError("Add a name, category, positive amount, and valid date up to today.");
      return;
    }
    onSave({ name: capitalizeExpense(name), amount: value, category: category.trim().replace(/\s+/g, " "), accountId: accountId || undefined,
      date: transaction && localDateInput(new Date(transaction.date)) === date ? transaction.date : timestamp });
  }

  return (
    <dialog ref={dialogRef} className="expense-dialog" onCancel={onClose} aria-labelledby="editor-title">
      <form onSubmit={submit} noValidate>
        <div className="dialog-heading"><h2 id="editor-title">{transaction ? "Make it yours." : "Remembered something?"}</h2>
          <button className="icon-button" type="button" aria-label="Close editor" onClick={onClose}>×</button></div>

        <label htmlFor="edit-name">What was it for?</label>
        <input id="edit-name" className="setup-input" value={name} maxLength={120} placeholder="Coffee, groceries, a ride…"
          onChange={(event) => { setName(event.target.value); if (!categoryPicked) setCategory(categoryFor(event.target.value)); }} />
        <div className="editor-columns">
          <div><label htmlFor="edit-amount">Amount · PHP</label><input id="edit-amount" className="setup-input" inputMode="decimal" value={amount} maxLength={20} onChange={(event) => setAmount(event.target.value)} /></div>
          <div><label htmlFor="edit-date">Date</label><input id="edit-date" className="setup-input" type="date" value={date} max={localDateInput()} onChange={(event) => setDate(event.target.value)} /></div>
        </div>
        <label htmlFor="edit-category">Category</label>
        <select id="edit-category" className="setup-input" value={customCategory ? "" : category} onChange={(event) => { setCustomCategory(event.target.value === ""); setCategory(event.target.value === "" ? "" : event.target.value); setCategoryPicked(true); }}>
          {!customCategory && !categories.includes(category) && <option value={category}>{category}</option>}
          {categories.map((item) => <option key={item}>{item}</option>)}
          <option value="">New category…</option>
        </select>
        {customCategory && <><label htmlFor="custom-category">Category name</label><input id="custom-category" className="setup-input" maxLength={40} placeholder="e.g. Pets" value={category} onChange={(event) => setCategory(event.target.value)} /></>}
        <label htmlFor="edit-account">Paid from</label>
        <select id="edit-account" className="setup-input" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          <option value="">Unassigned</option>
          {accountId && !accounts.some((item) => item.id === accountId) && <option value={accountId}>{accountLabel(accountId, accounts)}</option>}
          {accounts.filter((item) => !item.archived || item.id === accountId).map((item) => <option key={item.id} value={item.id}>{accountLabel(item.id, accounts)}</option>)}
        </select>
        {error && <p className="field-error" role="alert">{error}</p>}
        {transaction && onDelete && <button className="text-button delete-from-editor" type="button" onClick={onDelete}>Remove {transaction.name}</button>}
        <div className="dialog-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{transaction ? "Save changes" : "Add expense"}</button></div>
      </form>
    </dialog>
  );
}
