"use client";
import { categoryTone } from "@/lib/category-tone";
import { useRef, useState, type CSSProperties } from "react";
import { calendarMonth, calendarTotals, monthEntries, shiftMonth, averageDailyCents } from "@/lib/analytics";
import { localDateInput, money, totalExpenseCents, type Transaction } from "@/lib/finance";
import { accountLabel, type PaymentAccount } from "@/lib/accounts";
import { spendingBreakdown } from "@/lib/spending";
import { EntryList } from "./entry-list";
export function AnalyticsPanel({ items, accounts, onEdit, suggestedNames }: { items: Transaction[]; accounts: PaymentAccount[]; onEdit: (item: Transaction) => void; suggestedNames: Map<string, string> }) {
  const today = localDateInput();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [focusedDay, setFocusedDay] = useState(today);
  const [day, setDay] = useState<string | null>(today);
  const [account, setAccount] = useState("all");
  const [category, setCategory] = useState("All");
  const [scope, setScope] = useState<"month" | "all">("month");
  const calendar = useRef<HTMLDivElement>(null);
  const meta = calendarMonth(month);
  const sourceItems = items.filter((item) => localDateInput(new Date(item.date)) <= today && (account === "all" || (account === "unassigned" ? !item.accountId : item.accountId === account)));
  const monthly = monthEntries(sourceItems, month, today);
  const scoped = scope === "month" ? monthly : sourceItems;
  const filtered = monthly.filter((item) => category === "All" || item.category === category);
  const totals = calendarTotals(filtered);
  const categories = spendingBreakdown(scoped, "category"), sources = spendingBreakdown(scoped, "account");
  const rows = filtered.filter((item) => !day || localDateInput(new Date(item.date)) === day).sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
  function move(offset: number) { const next = shiftMonth(month, offset); setMonth(next); setDay(null); setFocusedDay(`${next}-01`); }
  return <div className="analytics-content">
    <div className="panel-heading"><div><span className="eyebrow">FOLLOW THE TRAIL</span><h1>Spending overview.</h1></div></div>
    <div className="analytics-source"><label htmlFor="analytics-account">Payment source</label><select id="analytics-account" aria-label="Calendar payment source" value={account} onChange={(e)=>setAccount(e.target.value)}><option value="all">All payment sources</option><option value="unassigned">Unassigned</option>{accounts.map((item)=><option key={item.id} value={item.id}>{accountLabel(item.id, accounts)}</option>)}</select></div>
    <section className="calendar-card" aria-label="Spending calendar">
      <div className="calendar-heading"><button type="button" className="icon-button" aria-label="Previous month" onClick={()=>move(-1)}>‹</button><h2 aria-live="polite">{meta.label}</h2><button type="button" className="icon-button" aria-label="Next month" disabled={month >= today.slice(0,7)} onClick={()=>move(1)}>›</button></div>
      <div className="calendar-summary"><div><span>{category === "All" ? "Spent this month" : category}</span><strong>{money(totalExpenseCents(filtered)/100)}</strong></div><button className="text-button" type="button" onClick={()=>{setMonth(today.slice(0,7));setDay(today);setFocusedDay(today);}}>Today</button></div>
      {category !== "All" && <button className="calendar-filter" type="button" onClick={()=>setCategory("All")}>{category} <span aria-hidden="true">×</span><span className="sr-only">Clear category filter</span></button>}
      <div className="calendar-week" aria-hidden="true">{["S","M","T","W","T","F","S"].map((label,i)=><span key={i}>{label}</span>)}</div>
      <div ref={calendar} className="calendar-grid" role="group" aria-label={`${meta.label} spending days`}>
        {Array.from({length:meta.offset},(_,i)=><span key={`blank-${i}`} />)}
        {Array.from({length:meta.days},(_,i)=>{const key=`${month}-${String(i+1).padStart(2,"0")}`, cents=totals.get(key)??0;return <button key={key} type="button" data-has-spending={cents > 0 || undefined} tabIndex={focusedDay===key?0:-1} onFocus={()=>setFocusedDay(key)} aria-pressed={day===key} aria-current={key===today?"date":undefined} disabled={key>today} aria-label={`${new Date(`${key}T12:00:00`).toLocaleDateString("en-PH",{month:"long",day:"numeric",year:"numeric"})}: ${money(cents/100)}`} onClick={()=>setDay(day===key?null:key)} onKeyDown={(e)=>{const delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7} as Record<string,number>)[e.key];if(delta){e.preventDefault();const buttons=calendar.current?.querySelectorAll<HTMLButtonElement>("button");const target=buttons?.[Math.max(0,Math.min(meta.days-1,i+delta))];if(target&&!target.disabled)target.focus();}}}><span>{i+1}</span><small>{cents ? cents>=100000?`₱${(cents/100000).toFixed(1)}k`:`₱${(cents/100).toLocaleString("en-PH",{maximumFractionDigits:0})}` : ""}</small>{cents>0&&<i aria-hidden="true" />}</button>})}
      </div>
    </section>
    <section className="calendar-day-entries" aria-label="Selected day expenses"><div className="recent-strip-heading"><h2>{day?new Date(`${day}T12:00:00`).toLocaleDateString("en-PH",{month:"short",day:"numeric"}):"This month’s entries"}</h2>{day&&<button type="button" className="text-button" onClick={()=>setDay(null)}>Show month</button>}</div><p className="day-subtotal">{rows.length} {rows.length===1?"expense":"expenses"} · {money(totalExpenseCents(rows)/100)}</p>{rows.length?<EntryList items={rows} accounts={accounts} onEdit={onEdit} suggestedNames={suggestedNames} hideDates={Boolean(day)} />:<p className="empty-copy">No expenses recorded {day?"on this day":"in this month"}.</p>}</section>
    <section className="analytics-breakdown" aria-label="Spending breakdown"><div className="recent-strip-heading"><h2>Where it went</h2><select aria-label="Summary period" value={scope} onChange={(e)=>setScope(e.target.value as "month"|"all")}><option value="month">{meta.label}</option><option value="all">All time</option></select></div><div className="analytics-stats"><div><span>Total recorded</span><strong>{money(totalExpenseCents(scoped)/100)}</strong></div><div><span>{scope==="month"?"Daily average":"Expenses"}</span><strong>{scope==="month"?money(averageDailyCents(scoped,month,today)/100):scoped.length}</strong></div></div>
      {categories.length?<><h3>By category</h3>{categories.map((row)=><button key={row.id} className="breakdown-row" type="button" style={{"--category-color": `var(--category-${categoryTone(row.id)})`} as CSSProperties} aria-label={`Show ${row.id} in calendar`} onClick={()=>{setCategory(row.id);setDay(null);calendar.current?.scrollIntoView({block:"center",behavior:document.documentElement.dataset.motion==="reduced"||matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}}><span><span><i className="category-dot" aria-hidden="true" />{row.id} <small>{Math.round(row.share)}%</small></span><strong>{money(row.cents/100)}</strong></span><span className="data-bar" aria-hidden="true"><span style={{width:`${row.share}%`}} /></span></button>)}<h3>By payment source</h3>{sources.map((row)=><div className="analytics-source-row" key={row.id}><span>{accountLabel(row.id==="unassigned"?undefined:row.id,accounts)}</span><strong>{money(row.cents/100)}</strong></div>)}</>:<p className="empty-copy">Your spending story will build as you log.</p>}
    </section>
  </div>;
}
