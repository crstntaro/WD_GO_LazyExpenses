"use client";

import { AnimatedDetails } from "./animated-details";
import { ColorWheel } from "@/components/color-wheel";
import { ThemeToggle } from "@/components/theme-toggle";
import { DataTools } from "@/components/data-tools";
import { AccountManager } from "@/components/account-manager";
import { type Setup } from "@/lib/setup-store";
import { type Transaction } from "@/lib/finance";

export function TrackerSettings({ setup, transactions, update, onSaved, onSetup, onImport, onAccount }: {
  setup: Setup; transactions: Transaction[]; update: (patch: Partial<Setup>) => void;
  onSaved: (message: string) => void; onSetup: () => void; onImport: (raw: string) => string; onAccount: () => void;
}) {
  return <div className="settings-content">
      <div className="panel-heading"><h1>Settings</h1></div>
    <AnimatedDetails className="settings-section" id="appearance-title-section"><summary><strong>Appearance</strong><span>Theme, color, motion</span></summary><div className="settings-section-body">
      <div className="setting-row"><div><strong>Light mode</strong></div><ThemeToggle /></div>
      <ColorWheel setup={setup} update={update} />
      <label className="setting-row"><span><strong>Reduce motion</strong><span>Keep transitions and feedback quiet.</span></span><input type="checkbox" role="switch" checked={setup.reduceMotion ?? false} onChange={(event) => update({ reduceMotion: event.target.checked })} /></label>
      <label className="setting-row"><span><strong>Solid navigation</strong><span>Use an opaque tab bar for extra clarity.</span></span><input type="checkbox" role="switch" checked={setup.reduceTransparency ?? false} onChange={(event) => update({ reduceTransparency: event.target.checked })} /></label>
    </div></AnimatedDetails>
    <AnimatedDetails className="settings-section" id="smart-title-section"><summary><strong>Smart logging</strong><span>Suggestions and confirmations</span></summary><div className="settings-section-body">
      <label className="setting-row"><span><strong>Learn my usual expenses</strong><span>Suggest names for familiar amounts, on this device.</span></span><input type="checkbox" role="switch" checked={setup.learningEnabled !== false} onChange={(event) => update({ learningEnabled: event.target.checked })} /></label>
      <label className="setting-row" htmlFor="confirmation-time"><span><strong>Suggestion prompt</strong><span>Entries stay saved when the prompt closes.</span></span>
        <select id="confirmation-time" value={setup.confirmationSeconds ?? 8} onChange={(event) => update({ confirmationSeconds: Number(event.target.value) as 0 | 8 | 15 })}>
          <option value={8}>8 seconds</option><option value={15}>15 seconds</option><option value={0}>Keep open</option>
        </select>
      </label>
      <details className="settings-explainer"><summary>How suggestions work</summary><p>Names you enter or confirm and category corrections teach this device. Repeated payment-source and time patterns can help tell same-price purchases apart. Unanswered guesses never teach the app. Turning learning off keeps your entries saved.</p></details>
    </div></AnimatedDetails>
    <AnimatedDetails className="settings-section" id="accounts-title-section"><summary><strong>Payment sources</strong><span>Cash, wallets, bank accounts, cards</span></summary><div className="settings-section-body">
      <AccountManager setup={setup} update={update} transactions={transactions} />
      <details className="settings-explainer"><summary>About payment sources</summary><p>Nicknames stay on this device. Archiving hides a source from new expenses and keeps its history. Amounts are edited locally and updated by recorded spending. No bank or wallet is connected.</p></details>
    </div></AnimatedDetails>
    <AnimatedDetails className="settings-section" id="profile-title-section"><summary><strong>You & your budget</strong><span>Profile and monthly limit</span></summary><div className="settings-section-body">
      <button type="button" className="secondary-button" onClick={onAccount}>Edit profile & budget</button>
    </div></AnimatedDetails>
    <AnimatedDetails className="settings-section" id="data-title-section"><summary><strong>Backup & data</strong><span>Download or import your paper trail</span></summary><div className="settings-section-body">
      <DataTools setup={setup} transactions={transactions} onImport={onImport} onSaved={onSaved} />
      <button className="text-button revisit-setup" type="button" onClick={onSetup}>Revisit welcome & setup</button>
    </div></AnimatedDetails>
  </div>;
}
