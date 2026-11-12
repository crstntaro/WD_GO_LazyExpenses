"use client";

import { useId, useState, useEffect, useRef } from "react";
import { ACCOUNT_KINDS, ACCOUNT_KIND_LABELS, PROVIDERS, accountProvider, accountSpentCents, accountBalanceCents, type Provider, type AccountKind } from "@/lib/accounts";
import { parseAmount, type Transaction } from "@/lib/finance";
import { AccountCards } from "./account-cards";
import type { Setup } from "@/lib/setup-store";

export function AccountManager({ setup, update, transactions = [] }: { setup: Setup; transactions?: Transaction[]; update: (patch: Partial<Setup>) => void }) {
  const prefix = useId();
  const editRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<HTMLDivElement>(null);
  const accounts = setup.accounts ?? [];
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("ewallet");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editProvider, setEditProvider] = useState<Provider>("other");
  const [provider, setProvider] = useState<Provider>("other");
  const [error, setError] = useState("");
  useEffect(()=>{if(editing){editRef.current?.scrollIntoView({block:"nearest",behavior:"instant"});editRef.current?.querySelector("input")?.focus({preventScroll:true});}},[editing]);
  function add(accountName: string, accountKind: AccountKind, chosenProvider: Provider = provider) {
    const clean = accountName.trim().replace(/\s+/g, " ");
    if (!clean || accounts.length >= 50 || accounts.some((item) => item.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) {
      setError(!clean ? "Give it a name." : accounts.length >= 50 ? "You can keep up to 50 payment sources." : "That name is already in your list.");
      return;
    }
    const account = { id: crypto.randomUUID(), name: clean, kind: accountKind, provider: chosenProvider === "other" ? undefined : chosenProvider };
    update({ accounts: [...accounts, account], defaultAccountId: setup.defaultAccountId || account.id });
    setName(""); setError("");
  }
  function beginEdit(id: string) {
    const account = accounts.find((item)=>item.id===id); if (!account) return;
    setEditing(id); setEditName(account.name); setEditProvider(accountProvider(account));
    const amount = accountBalanceCents(account, transactions);
    setEditAmount(amount === null ? "" : String(amount/100)); setError("");
  }
  function finishEdit(){const id=editing;setEditing(null);setError("");requestAnimationFrame(()=>Array.from(managerRef.current?.querySelectorAll<HTMLButtonElement>("[data-account-id]")??[]).find((button)=>button.dataset.accountId===id)?.focus());}
  function saveAccount() {
    const current = accounts.find((item)=>item.id===editing); if (!current) return;
    const clean = editName.trim().replace(/\s+/g," ");
    const entered = editAmount.trim();
    const negative = current.kind !== "card" && entered.startsWith("-");
    const rawAmount = negative ? entered.slice(1) : entered;
    const cents = rawAmount === "" ? undefined : rawAmount === "0" || /^0\.0{1,2}$/.test(rawAmount) ? 0 : parseAmount(rawAmount);
    if (!clean || accounts.some((item)=>item.id!==editing && item.name.toLowerCase()===clean.toLowerCase()) || cents === null || (negative && !rawAmount)) {setError("Use a unique name and a valid peso amount. Card amounts owed must be ₱0 or more.");return;}
    update({accounts:accounts.map((item)=>item.id===editing?{...item,name:clean,provider:editProvider,balanceCents:cents === undefined ? undefined : Math.round(cents*100)*(negative?-1:1),balanceRecordedCents:cents === undefined ? undefined : accountSpentCents(item,transactions)}:item)});
    finishEdit();
  }
  return <div ref={managerRef} className="account-manager">
    <AccountCards accounts={accounts} items={transactions} onEdit={beginEdit} />
    {editing && <div ref={editRef} className="account-edit-form" role="group" aria-label="Edit payment account" onKeyDown={(e)=>{if(e.key==="Enter" && e.target instanceof HTMLInputElement){e.preventDefault();saveAccount();}}}><h3>Edit account</h3><label htmlFor={`${prefix}-edit-name`}>Account name</label><input id={`${prefix}-edit-name`} className="setup-input" value={editName} maxLength={40} onChange={(e)=>setEditName(e.target.value)} /><label htmlFor={`${prefix}-edit-provider`}>Provider</label><select id={`${prefix}-edit-provider`} className="setup-input" value={editProvider} onChange={(e)=>setEditProvider(e.target.value as Provider)}>{Object.entries(PROVIDERS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><label htmlFor={`${prefix}-edit-amount`}>{accounts.find((item)=>item.id===editing)?.kind === "card" ? "Current amount owed · PHP" : "Current balance · PHP"}</label><input id={`${prefix}-edit-amount`} className="setup-input" inputMode="decimal" value={editAmount} placeholder="Not set" maxLength={20} onChange={(e)=>setEditAmount(e.target.value)} /><p className="account-balance-help">Set the amount you have now. Future recorded spending updates it. Leave blank to stop tracking an amount. No bank connection.</p><div className="account-edit-actions"><button className="primary-button" type="button" onClick={saveAccount}>Save account</button><button className="text-button" type="button" onClick={finishEdit}>Cancel</button></div></div>}
    <div className="account-presets" aria-label="Quick add payment source">
      {([{ name: "Cash", kind: "cash" }, { name: "GCash", kind: "ewallet" }, { name: "Maya", kind: "ewallet" }] as const).map((preset) =>
        <button className="secondary-button" type="button" key={preset.name} disabled={accounts.some((item) => item.name.toLowerCase() === preset.name.toLowerCase()) || accounts.length >= 50} onClick={() => add(preset.name, preset.kind, preset.name === "GCash" ? "gcash" : preset.name === "Maya" ? "maya" : "other")}>+ {preset.name}</button>)}
    </div>
    {accounts.length > 0 && <ul className="account-list">{accounts.map((account) => <li key={account.id}>
      <span><strong>{account.name}</strong><small>{ACCOUNT_KIND_LABELS[account.kind]}{account.archived ? " · Archived" : setup.defaultAccountId === account.id ? " · Default" : ""}</small></span>
      <button type="button" className="text-button" aria-label={`${account.archived ? "Restore" : "Archive"} ${account.name}`} onClick={() => update({ accounts: accounts.map((item) => item.id === account.id ? { ...item, archived: !item.archived } : item), ...(setup.defaultAccountId === account.id && !account.archived ? { defaultAccountId: "" } : {}) })}>{account.archived ? "Restore" : "Archive"}</button>
    </li>)}</ul>}
    <details className="account-custom"><summary>Add another payment source</summary>
    <div className="account-add-fields">
      <div><label htmlFor={`${prefix}-name`}>Account or card nickname</label><input id={`${prefix}-name`} className="setup-input" maxLength={40} value={name} placeholder="e.g. BPI debit" onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(name, kind); } }} /></div>
      <div><label htmlFor={`${prefix}-provider`}>Provider</label><select id={`${prefix}-provider`} className="setup-input" value={provider} onChange={(e)=>setProvider(e.target.value as Provider)}>{Object.entries(PROVIDERS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
      <div><label htmlFor={`${prefix}-kind`}>Type</label><select id={`${prefix}-kind`} className="setup-input" value={kind} onChange={(event) => setKind(event.target.value as AccountKind)}>{ACCOUNT_KINDS.map((item) => <option key={item} value={item}>{ACCOUNT_KIND_LABELS[item]}</option>)}</select></div>
    </div>
    <button className="secondary-button account-add-button" type="button" onClick={() => add(name, kind)}>Add payment source</button>
    </details>
    {error && <p className="field-error" role="alert">{error}</p>}
    {accounts.some((item) => !item.archived) && <div className="account-default"><label htmlFor={`${prefix}-default`}>Default for new expenses</label><select id={`${prefix}-default`} className="setup-input" value={setup.defaultAccountId ?? ""} onChange={(event) => update({ defaultAccountId: event.target.value })}><option value="">No default</option>{accounts.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
  </div>;
}
