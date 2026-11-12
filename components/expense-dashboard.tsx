"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { chooseLogCopy, logCopy } from "@/lib/log-copy";
import { AppHeader } from "@/components/app-header";
import { LogMascot } from "@/components/log-mascot";
import { BottomTabs, type Tab } from "@/components/bottom-tabs";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { AccountPanel } from "@/components/account-panel";
import { ReviewReminder } from "@/components/review-reminder";
import { EntriesPanel } from "@/components/entries-panel";
import { BatchCatchUp } from "@/components/batch-catch-up";
import { capitalizeExpense } from "@/lib/expense-language";
import { prepareImport } from "@/lib/backup";
import { EntryList } from "@/components/entry-list";
import { SuggestionPrompt } from "@/components/suggestion-prompt";
import { TrackerSettings } from "@/components/tracker-settings";
import { TransactionEditor, type ExpenseFields } from "@/components/transaction-editor";
import { budgetCents, type Setup } from "@/lib/setup-store";
import { STORAGE_KEY, dateLabel, localDateInput, money, needsDetails, totalExpenseCents, type Transaction } from "@/lib/finance";
import { accountLabel } from "@/lib/accounts";
import { resolveEntry, suggestExpense, usualExpenses } from "@/lib/patterns";
import { createTransactionStore } from "@/lib/transaction-store";

const transactionStore = createTransactionStore(() => window.localStorage);
function subscribe(listener: () => void) {
  const unsubscribe = transactionStore.subscribe(listener);
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === STORAGE_KEY) transactionStore.read(); };
  window.addEventListener("storage", onStorage);
  return () => { unsubscribe(); window.removeEventListener("storage", onStorage); };
}

type Feedback = { message: string; undo?: Transaction };
type Props = { setup: Setup; onSetup: () => void; onUpdateSetup: (patch: Partial<Setup>) => void };

export function ExpenseDashboard({ setup, onSetup, onUpdateSetup }: Props) {
  const { transactions, loaded, storageWarning } = useSyncExternalStore(subscribe, transactionStore.getSnapshot, transactionStore.getServerSnapshot);
  const [accountOpen, setAccountOpen] = useState(false);
  const [copyIndex, setCopyIndex] = useState(() => chooseLogCopy());
  const copy = logCopy(copyIndex, setup.name);
  const [tab, setTab] = useState<Tab>("log");
  const [entry, setEntry] = useState("");
  const [entryMode, setEntryMode] = useState<"amount" | "words">("amount");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<string | null>(null);
  const [skippedReview, setSkippedReview] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const previousReview = useRef<string | undefined>(undefined);
  const dismissSuggestion = useCallback(() => setSuggestedId(null), []);

  useEffect(() => {
    if (!feedback || feedback.undo) return;
    const timer = window.setTimeout(() => setFeedback(null), 6500);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    if (!lastAddedId) return;
    const timer = window.setTimeout(() => setLastAddedId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [lastAddedId]);

  const accounts = useMemo(() => setup.accounts ?? [], [setup.accounts]);
  const activeAccounts = accounts.filter((account) => !account.archived);
  const chosenAccount = paymentChoice ?? setup.defaultAccountId ?? "";
  const paymentId = activeAccounts.some((account) => account.id === chosenAccount) ? chosenAccount : "";
  const sorted = useMemo(() => [...transactions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)), [transactions]);
  const review = useMemo(() => sorted.filter(needsDetails), [sorted]);
  const today = localDateInput();
  const todaySpent = totalExpenseCents(transactions.filter((item) => localDateInput(new Date(item.date)) === today));
  const month = localDateInput().slice(0, 7);
  const monthSpent = useMemo(() => totalExpenseCents(transactions.filter((item) => localDateInput(new Date(item.date)).startsWith(month))), [transactions, month]);
  const monthlyBudget = setup.budgetEnabled ? budgetCents(setup.budgetInput) : null;
  const learning = setup.learningEnabled !== false;
  const usuals = useMemo(() => learning ? usualExpenses(transactions, new Date(), { accountId: paymentId || undefined }) : [], [transactions, learning, paymentId]);
  const suggestedNames = useMemo(() => {
    const names = new Map<string, string>();
    if (!learning) return names;
    const amounts = new Map<string, ReturnType<typeof suggestExpense>>();
    for (const item of review) {
      if (item.source !== "amount-only") continue;
      const cents = `${Math.round(item.amount * 100)}:${item.accountId ?? ""}`;
      if (!amounts.has(cents)) amounts.set(cents, suggestExpense(item.amount, transactions, new Date(), { accountId: item.accountId, allowTime: false }));
      const suggestion = amounts.get(cents);
      if (suggestion) names.set(item.id, suggestion.name);
    }
    return names;
  }, [transactions, review, learning]);
  const entryInput = expenseName.trim() ? `${entry} ${expenseName.trim()}` : entry;
  const preview = resolveEntry(entryInput, transactions, learning, new Date(), { accountId: paymentId || undefined, accounts });
  const suggested = suggestedId ? transactions.find((item) => item.id === suggestedId && needsDetails(item)) : undefined;
  const editing = editor?.id ? transactions.find((item) => item.id === editor.id) : undefined;
  const reviewItem = review.find((item) => !skippedReview.includes(item.id));
  const candidate = reviewItem ? suggestedNames.get(reviewItem.id) : undefined;
  const reviewId = reviewItem?.id;
  useEffect(() => {
    if (tab === "catch-up" && previousReview.current && previousReview.current !== reviewId) reviewHeading.current?.focus({ preventScroll: true });
    previousReview.current = reviewId;
  }, [reviewId, tab]);


  function changeTab(next: Tab) {
    if (next === "log" && tab !== "log") setCopyIndex(previous => chooseLogCopy(previous));
    setTab(next);
    setQuestionKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded) return;
    const parsed = resolveEntry(entryInput, transactions, learning, new Date(), { accountId: paymentId || undefined, accounts });
    if (!parsed) {
      setError(entryMode === "amount" ? "Enter an amount above ₱0, with up to two decimal places." : "Use one purchase and one positive peso amount. You can include today or yesterday.");
      inputRef.current?.focus();
      return;
    }
    const transaction: Transaction = { ...parsed, accountId: parsed.accountId ?? (paymentId || undefined), id: crypto.randomUUID(), date: parsed.date ?? new Date().toISOString() };
    transactionStore.update((items) => [transaction, ...items]);
    setEntry(""); setExpenseName(""); setDetailsOpen(false); setError(""); setLastAddedId(transaction.id); setFeedback(null);
    if (parsed.needsReview) {
      setSuggestedId(transaction.id);
      setQuestionKey((key) => key + 1);
    } else {
      setSuggestedId(null);
      setFeedback({ message: `${money(transaction.amount)} logged for ${transaction.name}.` });
    }
    inputRef.current?.focus();
  }

  function edit(item: Transaction) { setSuggestedId(null); setFeedback(null); setEditor({ id: item.id }); }
  function confirm(item: Transaction) {
    const suggestion = item.source === "amount-only" && learning ? suggestExpense(item.amount, transactions, new Date(), { accountId: item.accountId, allowTime: false }) : null;
    if (item.source === "amount-only" && !suggestion) return;
    const name = capitalizeExpense(suggestion?.name ?? item.name);
    transactionStore.update((items) => items.map((current) => current.id === item.id ? { ...current, name, category: suggestion?.category ?? current.category, source: "confirmed", needsReview: false } : current));
    setSuggestedId(null);
    setFeedback({ message: `${name} confirmed.` });
  }
  function remove(item: Transaction) {
    transactionStore.update((items) => items.filter((current) => current.id !== item.id));
    if (suggestedId === item.id) setSuggestedId(null);
    setFeedback({ message: `${item.name} removed.`, undo: item });
  }
  function undo(item: Transaction) {
    transactionStore.update((items) => items.some((current) => current.id === item.id) ? items : [item, ...items]);
    setFeedback({ message: `${item.name} restored.` });
  }
  function save(fields: ExpenseFields) {
    if (editor?.id) {
      const id = editor.id;
      let found = false;
      transactionStore.update((items) => items.map((item) => {
        if (item.id !== id) return item;
        found = true;
        return { ...item, ...fields, source: "manual", needsReview: false };
      }));
      setFeedback({ message: found ? "Details updated. Your paper trail is a little clearer." : "That entry is no longer available." });
    } else {
      const item: Transaction = { ...fields, id: crypto.randomUUID(), source: "manual", needsReview: false };
      transactionStore.update((items) => [item, ...items]);
      setLastAddedId(item.id);
      setFeedback({ message: `${fields.name} added to the day it happened.` });
    }
    setEditor(null);
  }

  function importBackup(raw: string) {
    transactionStore.read();
    const plan = prepareImport(raw, transactionStore.getSnapshot().transactions, accounts);
    if (plan.sourceCount) onUpdateSetup({ accounts: plan.accounts });
    if (plan.entries.length) transactionStore.update((items) => [...plan.entries.filter((entry) => !items.some((item) => item.id === entry.id)), ...items]);
    return `${plan.entries.length} entries imported. ${plan.skipped} existing entries kept.`;
  }

  return <main className="site tracker-site" id="top">
    <div className="site-inner">
      <AppHeader questionKey={questionKey} onHome={() => changeTab("log")} onAccount={()=>setAccountOpen(true)} />
      {storageWarning && <p className="warning" role="alert">{storageWarning}</p>}
      <BottomTabs active={tab} onChange={changeTab} reviewCount={review.length} />
      <div className="top-layout tracker-body">
        <section role="tabpanel" id="panel-log" aria-labelledby="tab-log" hidden={tab !== "log"} className="tab-panel">
          <div className="log-introduction">
            <div><p className="dashboard-greeting">{copy.greeting}</p>
              <h1 id="entry-title" tabIndex={-1}>{copy.title}</h1><p className="log-today"><strong>{money(todaySpent / 100)}</strong> today</p>
            </div>
          </div>
          <form onSubmit={addExpense} noValidate className="quick-entry-form expense-composer">

            <div className="amount-label"><label htmlFor="expense-input">{entryMode === "amount" ? "Amount" : "Expense note"}</label><button className="entry-mode-toggle" type="button" aria-pressed={entryMode === "words"} onClick={() => { setEntryMode(entryMode === "amount" ? "words" : "amount"); setError(""); inputRef.current?.focus(); }}>{entryMode === "amount" ? "Use words" : "Use amount"}</button></div>
            <div className={`peso-input${entryMode === "words" ? " words-input" : ""}`}>{entryMode === "amount" && <span className="peso-prefix" aria-hidden="true">₱</span>}<input id="expense-input" ref={inputRef} value={entry} disabled={!loaded}
              type="text" inputMode={entryMode === "amount" ? "decimal" : "text"} autoComplete="off" spellCheck={false} placeholder={entryMode === "amount" ? "0.00" : "What do you remember?"}
              style={entryMode === "amount" && entry.length > 7 ? { fontSize: `clamp(24px, calc((100vw - 120px) / ${entry.length} * 1.5), 54px)` } : undefined} maxLength={140} aria-invalid={Boolean(error)}
              aria-describedby={error || (preview && preview.source !== "amount-only") ? "entry-helper" : undefined}
              onFocus={() => setInputActive(true)} onBlur={() => setInputActive(false)} onChange={(event) => { setEntry(event.target.value); setError(""); }} /></div>
            <details className="optional-entry-details" open={detailsOpen}><summary onClick={(event) => { event.preventDefault(); setDetailsOpen((open) => !open); }}>Add a name <span>Optional</span></summary><div className="expense-name-field"><label htmlFor="expense-name">Expense name <span>Optional</span></label><input id="expense-name" value={expenseName} maxLength={120} type="text" autoComplete="off" placeholder="What was it for?" onFocus={() => setInputActive(true)} onBlur={() => setInputActive(false)} onChange={(event) => { setExpenseName(event.target.value); setError(""); }} /></div></details>
            {(error || (preview && preview.source !== "amount-only")) && <p id="entry-helper" className={`entry-helper${error ? " error" : ""}`} role={error ? "alert" : undefined}>
              {error || (preview?.source === "suggested" ? `Maybe ${preview.name}?${preview.date ? ` · ${dateLabel(preview.date)}` : ""}${preview.accountId ? ` · ${accountLabel(preview.accountId, accounts)}` : ""}` : preview ? `${money(preview.amount)} · ${preview.name}${preview.date ? ` · ${dateLabel(preview.date)}` : ""}${preview.accountId ? ` · ${accountLabel(preview.accountId, accounts)}` : ""}` : "")}
            </p>}
            {activeAccounts.length > 0 ? <div className="quick-payment"><label htmlFor="log-account">Paid from</label><select id="log-account" value={preview?.accountId ?? paymentId} disabled={Boolean(preview?.accountId)} title={preview?.accountId ? "Payment source comes from your note. Edit the note to change it." : undefined} onChange={(event) => setPaymentChoice(event.target.value)}><option value="">Unassigned</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div> : <button className="text-button payment-setup-link" type="button" onClick={() => setAccountOpen(true)}>+ Add payment source</button>}
            <button className="add-button save-expense" disabled={!loaded} type="submit">Save expense <span aria-hidden="true">↗</span></button>
            <LogMascot state={lastAddedId ? "saved" : preview?.source === "suggested" ? "thinking" : "waiting"} attentive={inputActive} arrivalTarget />
          </form>
          <button className="text-button log-catch-up-link" type="button" onClick={() => changeTab("catch-up")}>Catch up on a missed day <span aria-hidden="true">→</span></button>
          {usuals.length > 0 && <div className="usuals"><span>Your shortcuts</span><div>{usuals.map((usual) => <button type="button" key={`${usual.amount}-${usual.name}`} onClick={() => { setEntryMode("amount"); setEntry(String(usual.amount)); setExpenseName(usual.name); setDetailsOpen(true); setError(""); inputRef.current?.focus(); }}>
            <strong>{money(usual.amount)}</strong><span>{usual.name}</span></button>)}</div></div>}
          <section className="spending-slip" aria-label="Spending summary">
            <div><span>This month</span><strong>{loaded ? money(monthSpent / 100) : "—"}</strong></div>
            {monthlyBudget !== null ? <div><span>{monthlyBudget >= monthSpent ? "Budget left" : "Over budget"}</span><strong>{money(Math.abs(monthlyBudget - monthSpent) / 100)}</strong></div> : <button className="text-button" type="button" onClick={() => changeTab("analytics")}>See spending →</button>}
            {monthlyBudget !== null && <div className="budget-track" role="progressbar" aria-label="Monthly budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(monthSpent / monthlyBudget * 100))} aria-valuetext={`${money(monthSpent / 100)} of ${money(monthlyBudget / 100)} recorded`}><span style={{ width: `${Math.min(100, monthSpent / monthlyBudget * 100)}%` }} /></div>}
          </section>
          <div className="recent-strip-heading"><h2>Latest entries</h2><button className="text-button" type="button" onClick={() => changeTab("entries")}>All entries <span aria-hidden="true">→</span></button></div>
          {!loaded ? <p className="empty-copy">Opening your paper trail…</p> : sorted.length ? <EntryList accounts={accounts} suggestedNames={suggestedNames} items={sorted.slice(0, 3)} onEdit={edit} lastAddedId={lastAddedId} /> : <p className="empty-copy">No entries yet.</p>}
          {review.length > 0 && <button className="catch-up-nudge" type="button" onClick={() => changeTab("catch-up")}><span><strong>{review.length} {review.length === 1 ? "entry has" : "entries have"} a loose end.</strong></span><span aria-hidden="true">→</span></button>}
        </section>

        <section role="tabpanel" id="panel-entries" aria-labelledby="tab-entries" hidden={tab !== "entries"} className="tab-panel">
          <EntriesPanel items={transactions} accounts={accounts} suggestedNames={suggestedNames} onEdit={edit} onLog={() => changeTab("log")} lastAddedId={lastAddedId} onAnalytics={()=>changeTab("analytics")} />
        </section>

        <section role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics" hidden={tab !== "analytics"} className="tab-panel"><AnalyticsPanel items={transactions} accounts={accounts} onEdit={edit} suggestedNames={suggestedNames} /></section>

        <section role="tabpanel" id="panel-catch-up" aria-labelledby="tab-catch-up" hidden={tab !== "catch-up"} className="tab-panel">
          <div className="catch-up-heading"><div className="panel-heading"><h1>Pick up the trail.</h1></div></div>
          <div className="recovery-note"><strong>{review.length ? `${review.length} ${review.length === 1 ? "loose end" : "loose ends"} to look through.` : "Nothing waiting for details."}</strong>{review.length > 0 && <p>Already counted. Just checking the details.</p>}</div>
          {reviewItem ? <article className="review-focus" key={reviewItem.id}><LogMascot state="thinking" />
            <span className="eyebrow">ONE AT A TIME</span><div className="review-title"><h2 ref={reviewHeading} tabIndex={-1}>{capitalizeExpense(candidate ?? reviewItem.name)}</h2><strong>{money(reviewItem.amount)}</strong></div>
            <p>{dateLabel(reviewItem.date)} · {accountLabel(reviewItem.accountId, accounts)}</p>
            {(candidate || reviewItem.source === "suggested") && <p className="review-question">Is this correct?</p>}
            <div className="review-actions">{(candidate || reviewItem.source === "suggested") && <button className="primary-button" type="button" onClick={() => confirm(reviewItem)} aria-label={candidate ? `Use ${candidate}` : `Confirm ${reviewItem.name}`}>Yes, correct</button>}<button className={candidate || reviewItem.source === "suggested" ? "secondary-button" : "primary-button"} type="button" onClick={() => edit(reviewItem)}>{candidate || reviewItem.source === "suggested" ? "Edit details" : "Add a name"}</button><button type="button" className="text-button" onClick={() => setSkippedReview((ids) => [...ids, reviewItem.id])}>Later</button></div>
          </article> : review.length > 0 ? <div className="empty-section"><h2 ref={reviewHeading} tabIndex={-1}>We can leave these for later.</h2><button className="text-button" type="button" onClick={() => setSkippedReview([])}>Review skipped entries</button></div> : <div className="caught-up" role="status"><LogMascot state="saved" /><h2 ref={reviewHeading} tabIndex={-1}>All caught up.</h2><p>Your paper trail is in order.</p></div>}
          <div className="remembered-expense"><h2>Missed a few?</h2><button className="primary-button" type="button" onClick={() => { setSuggestedId(null); setEditor({}); }}>Add a missed expense <span aria-hidden="true">↗</span></button></div>
          <BatchCatchUp history={transactions} accounts={accounts} defaultAccountId={paymentId} learning={learning} onSave={(entries) => { transactionStore.update((items) => [...entries, ...items]); setSkippedReview([]); setFeedback({ message: `${entries.length} expenses added.` }); }} />
        </section>

        <section role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" hidden={tab !== "settings"} className="tab-panel">
          <TrackerSettings onAccount={()=>setAccountOpen(true)} setup={setup} transactions={transactions} update={onUpdateSetup} onSaved={(message) => setFeedback({ message })} onSetup={onSetup} onImport={importBackup} />
        </section>
      </div>
      {accountOpen && <AccountPanel setup={setup} items={transactions} update={onUpdateSetup} onClose={()=>setAccountOpen(false)} />}
      <ReviewReminder count={review.length} available={loaded && tab === "log" && !inputActive && !entry && !expenseName && !suggested && !editor && !accountOpen} onReview={()=>changeTab("catch-up")} />
      {suggested && <SuggestionPrompt key={suggested.id} transaction={suggested} seconds={setup.confirmationSeconds ?? 8} persisted={!storageWarning} onConfirm={() => confirm(suggested)} onEdit={() => edit(suggested)} onDismiss={dismissSuggestion} />}
      {feedback && !suggested && <div className="entry-feedback" role="status"><span>{feedback.message}</span>{feedback.undo && <button type="button" onClick={() => undo(feedback.undo!)}>Undo</button>}<button className="feedback-close" type="button" aria-label="Dismiss message" onClick={() => setFeedback(null)}>×</button></div>}
      {editor && (!editor.id || editing) && <TransactionEditor history={transactions} accounts={accounts} defaultAccountId={paymentId || undefined} key={editor.id ?? "new"} transaction={editing} onDelete={editing ? () => { remove(editing); setEditor(null); } : undefined} onSave={save} onClose={() => setEditor(null)} />}
    </div>
  </main>;
}
