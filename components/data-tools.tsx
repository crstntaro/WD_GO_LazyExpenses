"use client";
import { useRef, useState } from "react";
import type { Setup } from "@/lib/setup-store";
import type { Transaction } from "@/lib/finance";
import { prepareImport, type ImportPlan } from "@/lib/backup";

export function DataTools({ setup, transactions, onImport, onSaved }: {
  setup: Setup; transactions: Transaction[]; onImport: (raw: string) => string; onSaved: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [raw, setRaw] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  function backup() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), setup, transactions }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `whereditgo-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); onSaved("Backup download started.");
  }
  async function inspect(file?: File) {
    const id = ++request.current;
    setError(""); setPlan(null); setRaw("");
    if (!file) return;
    setReading(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Choose a backup smaller than 5 MB.");
      const value = await file.text();
      if (id !== request.current) return;
      const next = prepareImport(value, transactions, setup.accounts ?? []);
      setRaw(value); setPlan(next);
    } catch (cause) { if (id === request.current) setError(cause instanceof Error ? cause.message : "This file couldn't be read."); }
    finally { if (id === request.current) setReading(false); }
  }
  function commit() {
    try { const message = onImport(raw); setPlan(null); setRaw(""); if (input.current) input.current.value = ""; onSaved(message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "This backup couldn't be imported."); }
  }
  return <div className="data-tools"><p className="muted">Your entries live in this browser. Keep a backup somewhere you can find it.</p>
    <div className="settings-data-actions"><button className="secondary-button" type="button" onClick={backup}>Download backup</button><label className="secondary-button file-button">Import backup<input ref={input} type="file" accept=".json,application/json" onChange={(event) => void inspect(event.target.files?.[0])} /></label></div>
    {reading && <p role="status">Reading backup…</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {plan && <section className="import-preview" aria-label="Backup preview"><strong>{plan.entries.length} new {plan.entries.length === 1 ? "entry" : "entries"} · {plan.sourceCount} new payment {plan.sourceCount === 1 ? "source" : "sources"}</strong><p>{plan.skipped} existing {plan.skipped === 1 ? "entry" : "entries"} will be kept.{plan.conflicts > 0 ? ` ${plan.conflicts} ${plan.conflicts === 1 ? "entry differs" : "entries differ"} from this backup; your current versions win.` : ""} Your profile and preferences stay as they are.</p><div className="settings-data-actions"><button className="primary-button" type="button" disabled={!plan.entries.length && !plan.sourceCount} onClick={commit}>Import new data</button><button className="text-button" type="button" onClick={() => { setPlan(null); setRaw(""); if (input.current) input.current.value = ""; }}>Cancel import</button></div></section>}
  </div>;
}
