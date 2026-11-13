"use client";
import { assetPath } from "@/lib/asset-path";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { budgetCents, type Setup, type Goal } from "@/lib/setup-store";
import { AccountManager } from "@/components/account-manager";

type Props = {
  setup: Setup;
  update: (patch: Partial<Setup>) => void;
  onComplete: () => void;
};

const goals: { value: Goal; title: string; description: string }[] = [
  { value: "understand", title: "See where my money goes", description: "Keep a clearer record of everyday spending." },
  { value: "budget", title: "Spend with a budget", description: "Keep an eye on a monthly spending limit." },
  { value: "catch-up", title: "Get back into tracking", description: "Start with what I remember, without the pressure." },
];

const stepLabels = ["", "About you", "Your focus", "Your budget", "Your pockets"];

function SetupCompanion({ children }: { children: React.ReactNode }) {
  return (
    <div className="setup-companion">
      <Image src={assetPath("/brand/paper-detective.png")} alt="" width={76} height={81} unoptimized />
      <p>{children}</p>
    </div>
  );
}

export function WelcomeFlow({ setup, update, onComplete }: Props) {
  const { step } = setup;
  useEffect(() => {
    const image = new window.Image();
    image.src = assetPath("/brand/detective-cooking.webp");
    void image.decode().catch(() => {});
  }, []);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const setupRef = useRef<HTMLElement>(null);
  const previousStep = useRef(step);
  const settingUp = step > 0;

  useEffect(() => {
    if (!settingUp) return;
    const shell = setupRef.current?.closest<HTMLElement>(".welcome-site");
    if (!shell) return;
    // On iOS, viewport units don't consistently shrink with the keyboard.
    // Keep the footer in normal flow, using the currently visible height.
    const viewport = window.visualViewport;
    const resize = () => shell.style.setProperty("--setup-height", `${viewport?.height ?? window.innerHeight}px`);
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      shell.style.removeProperty("--setup-height");
    };
  }, [settingUp]);

  useEffect(() => {
    if (previousStep.current !== step) {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      previousStep.current = step;
    }
  }, [step]);

  function go(next: Setup["step"]) {
    setError("");
    update({ step: next });
  }

  function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (setup.budgetEnabled && budgetCents(setup.budgetInput) === null) {
      setError("Enter a monthly amount above ₱0, with up to two decimal places.");
      document.getElementById("monthly-budget")?.focus();
      return;
    }
    setError("");
    if (step === 3) { go(4); return; }
    // Dismiss a mobile keyboard before measuring the mascot's flight.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
    onComplete();
  }

  if (step === 0) {
    return (
      <section className="welcome-screen flow-enter" aria-labelledby="welcome-title">
        <Image src={assetPath("/brand/paper-detective.png")} alt="A friendly paper detective with a magnifying glass."
          className="welcome-mascot" width={218} height={232} unoptimized preload />
        <h1 id="welcome-title" ref={headingRef} tabIndex={-1}>Hey there.</h1>
        <p>Let’s set up your own place to keep track of your spending.</p>
        <button className="primary-button" onClick={() => go(1)} type="button">Get started <span aria-hidden="true">→</span></button>
        <span className="welcome-privacy">No account needed. Your entries stay on this device.</span>
        <details className="install-help">
          <summary>Add to your home screen</summary>
          <p>On iPhone, open Safari’s Share menu and choose <strong>Add to Home Screen</strong>. On Android, open your browser’s menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
        </details>
      </section>
    );
  }

  return (
    <section ref={setupRef} className="setup-screen" data-step={step} aria-label="Personalize your tracker">
      <div className="setup-progress" aria-label={`Step ${step} of 4`}>
        <span>{stepLabels[step]} <span className="setup-step-count">{step} of 4</span></span>
        <div className="setup-progress-track" aria-hidden="true"><span style={{ width: `${step / 4 * 100}%` }} /></div>
      </div>
      <div className="setup-content flow-enter" key={step}>
        {step === 1 && (
          <form onSubmit={(event) => { event.preventDefault(); go(2); }}>
            <SetupCompanion>Hey! Let’s start with you.</SetupCompanion>
            <h1 ref={headingRef} tabIndex={-1}>What should I call you?</h1>
            <p className="setup-description">A first name, a nickname. Whatever feels like you.</p>
            <label className="setup-label" htmlFor="setup-name">Your name <span>Optional</span></label>
            <input className="setup-input" id="setup-name" name="given-name" autoComplete="given-name" maxLength={40}
              value={setup.name} placeholder="Your name or nickname" onChange={(event) => update({ name: event.target.value })} />
            <p className="setup-response">{setup.name.trim() ? <>Good to meet you, <strong>{setup.name.trim()}</strong>.</> : "We can keep it nameless, too. Your call."}</p>
            <div className="setup-actions">
              <button className="text-button" type="button" onClick={() => go(0)}>Back</button>
              <button className="primary-button" type="submit">{setup.name.trim() ? "That’s me" : "Continue"} <span aria-hidden="true">→</span></button>
            </div>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={(event) => { event.preventDefault(); go(3); }}>
            <SetupCompanion>{setup.name.trim() ? `Okay, ${setup.name.trim()}. We’ll take it one expense at a time.` : "We’ll take it one expense at a time."}</SetupCompanion>
            <h1 ref={headingRef} tabIndex={-1}>What brings you here?</h1>
            <p className="setup-description" id="goal-description">Pick what sounds most like you. There’s no wrong starting point.</p>
            <fieldset className="goal-options" aria-describedby="goal-description">
              <legend className="sr-only">Your main reason for tracking</legend>
              {goals.map((goal) => (
                <label className="goal-option" key={goal.value}>
                  <input type="radio" name="goal" value={goal.value} checked={setup.goal === goal.value}
                    onChange={() => update({ goal: goal.value })} />
                  <span><strong>{goal.title}</strong><span>{goal.description}</span></span>
                  <span className="choice-confirmation" aria-hidden="true">✓</span>
                </label>
              ))}
            </fieldset>
            <div className="setup-actions">
              <button className="text-button" type="button" onClick={() => go(1)}>Back</button>
              <button className="primary-button" type="submit">Continue <span aria-hidden="true">→</span></button>
            </div>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={finish} noValidate>
            <SetupCompanion>Budget or no budget, we’ll follow your lead.</SetupCompanion>
            <h1 ref={headingRef} tabIndex={-1}>Want to set a budget?</h1>
            <p className="setup-description">Choose a monthly limit, or start with just your expenses. You can change this later.</p>
            <fieldset className="budget-options">
              <legend className="sr-only">Choose whether to add a monthly budget</legend>
              <label><input type="radio" name="budget-choice" checked={!setup.budgetEnabled}
                onChange={() => { update({ budgetEnabled: false }); setError(""); }} /><span><strong>Let’s just start tracking</strong><span>I can add a budget when I’m ready.</span></span></label>
              <label><input type="radio" name="budget-choice" checked={setup.budgetEnabled}
                onChange={() => update({ budgetEnabled: true })} /><span><strong>I have a number in mind</strong><span>Set a monthly spending budget.</span></span></label>
            </fieldset>
            {setup.budgetEnabled && (
              <div className="budget-field flow-enter">
                <label className="setup-label" htmlFor="monthly-budget">Monthly budget <span>PHP</span></label>
                <div className="budget-input-wrap"><span aria-hidden="true">₱</span>
                  <input className="setup-input" id="monthly-budget" type="text" inputMode="decimal" autoComplete="off"
                    placeholder="e.g. 10,000" maxLength={20} value={setup.budgetInput}
                    aria-invalid={Boolean(error)} aria-describedby={error ? "budget-error" : undefined}
                    onChange={(event) => { update({ budgetInput: event.target.value }); setError(""); }} />
                </div>
                {error && <p id="budget-error" className="field-error" role="alert">{error}</p>}
              </div>
            )}
            <div className="setup-actions">
              <button className="text-button" type="button" onClick={() => go(2)}>Back</button>
              <button className="primary-button" type="submit">Continue <span aria-hidden="true">→</span></button>
            </div>
          </form>
        )}
        {step === 4 && <form onSubmit={finish}>
          <SetupCompanion>Which pocket did it come from?</SetupCompanion>
          <h1 ref={headingRef} tabIndex={-1}>How do you pay?</h1>
          <p className="setup-description">Cash, e-wallets, accounts, and cards. Just nicknames—no banking details.</p>
          <AccountManager setup={setup} update={update} />
          <div className="setup-actions"><button className="text-button" type="button" onClick={() => go(3)}>Back</button><button className="primary-button" type="submit">{setup.accounts?.some((account) => !account.archived) ? "Start tracking" : "Skip for now"} <span aria-hidden="true">→</span></button></div>
        </form>}
      </div>
    </section>
  );
}
