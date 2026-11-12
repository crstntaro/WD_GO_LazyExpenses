"use client";

import { useEffect, useRef } from "react";
import { capitalizeExpense } from "@/lib/expense-language";
import { money, type Transaction } from "@/lib/finance";
import { createAutoDismiss } from "@/lib/auto-dismiss";

type Props = {
  transaction: Transaction;
  seconds: number;
  onConfirm: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  persisted: boolean;
};

export function SuggestionPrompt({ transaction, seconds, onConfirm, onEdit, onDismiss, persisted }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const controls = useRef<{ pause: (reason: string) => void; resume: (reason: string) => void }>(null);

  useEffect(() => {
    const timer = createAutoDismiss(seconds * 1000, onDismiss);
    const reduced = document.documentElement.dataset.motion === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = seconds > 0 && !reduced ? barRef.current?.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration: seconds * 1000, fill: "forwards", easing: "linear" },
    ) : undefined;
    const pause = (reason: string) => { timer.pause(reason); animation?.pause(); };
    const resume = (reason: string) => { timer.resume(reason); if (!timer.paused) animation?.play(); };
    controls.current = { pause, resume };
    const visibility = () => document.hidden ? pause("hidden") : resume("hidden");
    const focus = () => document.hasFocus() ? resume("window") : pause("window");
    visibility();
    focus();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", focus);
    window.addEventListener("focus", focus);
    return () => {
      timer.dispose();
      animation?.cancel();
      controls.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", focus);
      window.removeEventListener("focus", focus);
    };
  }, [seconds, onDismiss]);

  const inferred = transaction.source === "suggested";
  return (
    <aside className="suggestion-prompt" aria-label="Review your saved entry"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") controls.current?.pause("hover"); }}
      onPointerLeave={() => controls.current?.resume("hover")}
      onFocusCapture={() => controls.current?.pause("focus")}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) controls.current?.resume("focus"); }}>
      <div className="suggestion-copy" role="status">
        <span className="suggestion-eyebrow">{inferred ? "A familiar amount" : "Amount saved"}</span>
        <strong>{money(transaction.amount)}{inferred ? ` for ${capitalizeExpense(transaction.name)}?` : " · Add the details later."}</strong>
        <p>{!persisted ? "This browser couldn't save the entry. Keep this tab open; you can still edit it." : inferred ? "Is this correct? It stays saved if you leave it." : "Your amount is recorded. Name it now, or find it in Catch-Up."}</p>
      </div>
      <div className="suggestion-actions">
        {inferred && <button className="small-primary" type="button" onClick={onConfirm}>Yes, correct</button>}
        <button className="secondary-button" type="button" onClick={onEdit}>{inferred ? "No, edit" : "Add a name"}</button>
        <button className="icon-button" type="button" aria-label="Dismiss prompt, keep entry saved" onClick={onDismiss}>×</button>
      </div>
      {seconds > 0 && <div className="suggestion-timer" aria-hidden="true"><div ref={barRef} /></div>}
    </aside>
  );
}
