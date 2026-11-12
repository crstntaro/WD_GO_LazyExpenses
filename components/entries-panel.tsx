"use client";

import { useState } from "react";
import { EntryList } from "@/components/entry-list";
import { dateLabel, localDateInput, money, totalExpenseCents, type Transaction } from "@/lib/finance";
import { accountLabel, type PaymentAccount } from "@/lib/accounts";
import { dayGroups, filterEntries, knownCategories, type Period } from "@/lib/spending";
import { entriesCSV } from "@/lib/backup";

export function EntriesPanel({ items, accounts, suggestedNames, onEdit, onLog, lastAddedId, onAnalytics }: {
  items: Transaction[]; accounts: PaymentAccount[]; suggestedNames: Map<string, string>;
  onEdit: (item: Transaction) => void; onLog: () => void; lastAddedId?: string | null; onAnalytics: () => void;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [category, setCategory] = useState("All");
  const [account, setAccount] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(localDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(localDateInput());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const invalidRange = period === "custom" && (!from || !to || from > to);
  const visible = invalidRange ? [] : filterEntries(items, { period, category, account, search, from, to });
  const total = totalExpenseCents(visible);
  const groups = dayGroups(visible);
  const accountIds = [...new Set([...accounts.map((item) => item.id), ...items.flatMap((item) => item.accountId ? [item.accountId] : [])])];
  const activeFilters = Number(category !== "All") + Number(account !== "all");
  function clear() { setCategory("All"); setAccount("all"); setSearch(""); }
  function exportCSV() {
    const url = URL.createObjectURL(new Blob([entriesCSV(visible, accounts)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `whereditgo-${period}-${localDateInput()}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <div className="panel-heading entries-heading"><div><span className="eyebrow">THE PAPER TRAIL</span><h1>Your spending.</h1></div><button type="button" className="text-button" onClick={exportCSV} disabled={!visible.length}>Export CSV</button></div>
    <div className="period-options" role="group" aria-label="Spending period">{([["month", "This month"], ["last-month", "Last month"], ["all", "All time"], ["custom", "Dates"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div>
    {period === "custom" && <div className="date-range flow-enter"><label>From<input type="date" value={from} max={to || localDateInput()} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} min={from} max={localDateInput()} onChange={(event) => setTo(event.target.value)} /></label></div>}
    {invalidRange && <p className="field-error" role="alert">Choose a start date on or before the end date.</p>}
    <div className="period-summary" aria-label="Period spending"><span>{period === "month" ? "Spent this month" : period === "last-month" ? "Spent last month" : period === "all" ? "Total recorded" : "Spent in this period"}</span><strong>{money(total / 100)}</strong><p>{visible.length} {visible.length === 1 ? "entry" : "entries"}{activeFilters || search ? " · Filtered" : ""}</p></div>
    <button type="button" className="entries-analytics-link" onClick={onAnalytics}><span>Calendar & category breakdowns</span><span aria-hidden="true">↗</span></button>
    <div className="entry-search-bar"><label className="sr-only" htmlFor="entry-search">Search entries</label><input id="entry-search" type="search" value={search} placeholder="Find an expense" onChange={(event) => setSearch(event.target.value)} /><button className="secondary-button" type="button" aria-expanded={filtersOpen} aria-controls="entry-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filters{activeFilters ? ` · ${activeFilters}` : ""}</button></div>
    <div id="entry-filters" className="entry-filters flow-enter" hidden={!filtersOpen}>
      <div className="entry-filter-field"><label htmlFor="category-filter">Category</label><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="All">All categories</option>{knownCategories(items).map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="entry-filter-field"><label htmlFor="account-filter">Payment source</label><select id="account-filter" value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">All payment sources</option><option value="unassigned">Unassigned</option>{accountIds.map((id) => <option key={id} value={id}>{accountLabel(id, accounts)}</option>)}</select></div>
      <button className="text-button" type="button" onClick={clear}>Clear filters</button>
    </div>
    {groups.length ? <div className="entry-days">{groups.map((group) => <section key={group.day} className="entry-day"><div className="day-heading"><h2>{dateLabel(group.entries[0].date)}</h2><span>{money(group.cents / 100)}</span></div><EntryList items={group.entries} accounts={accounts} suggestedNames={suggestedNames} onEdit={onEdit} lastAddedId={lastAddedId} hideDates /></section>)}</div> : <div className="empty-section"><strong>{items.length ? "Nothing in this view." : "Your paper trail starts here."}</strong><p>{items.length ? "Try another period or clear your filters." : "Log your first expense to see it here."}</p>{items.length > 0 && <button className="text-button" type="button" onClick={() => { clear(); setPeriod("all"); }}>Show all entries</button>}<button className="secondary-button" type="button" onClick={onLog}>Go to Log</button></div>}
  </>;
}
