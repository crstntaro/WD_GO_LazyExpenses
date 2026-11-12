"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { applyAccent } from "@/lib/accent";
import { WelcomeFlow } from "@/components/welcome-flow";
import { ExpenseDashboard } from "@/components/expense-dashboard";
import { DashboardArrival } from "@/components/dashboard-arrival";
import { createSetupStore, SETUP_KEY } from "@/lib/setup-store";

const setupStore = createSetupStore(() => window.localStorage);

function subscribe(listener: () => void) {
  const unsubscribe = setupStore.subscribe(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SETUP_KEY || event.key === null) setupStore.read();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

export default function Home() {
  const [arriving, setArriving] = useState(false);
  const { setup, loaded, warning } = useSyncExternalStore(
    subscribe, setupStore.getSnapshot, setupStore.getServerSnapshot,
  );
  const finishArrival = useCallback(() => {
    setArriving(false);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyAccent(setup.accent, setup.accentColor);
    document.documentElement.dataset.transparency = setup.reduceTransparency ? "solid" : "glass";
    document.documentElement.dataset.motion = setup.reduceMotion ? "reduced" : "system";
  }, [loaded, setup.accent, setup.accentColor, setup.reduceMotion, setup.reduceTransparency]);

  function completeSetup() {
    // Save completion before animating; a reload during the handoff goes
    // straight to the tracker, without replaying setup or losing any answers.
    setArriving(true);
    setupStore.update({ completed: true, name: setup.name.trim() });
  }

  if (loaded && setup.completed) {
    return (
      <>
        {warning && <p className="warning setup-storage-warning" role="alert">{warning}</p>}
        <DashboardArrival active={arriving} onComplete={finishArrival}>
          <ExpenseDashboard setup={setup} onSetup={() => setupStore.update({ completed: false, step: 1 })} onUpdateSetup={setupStore.update} />
        </DashboardArrival>
      </>
    );
  }

  return (
    <main className="site welcome-site" id="top">
      <div className="site-inner">
        {warning && <p className="warning" role="alert">{warning}</p>}
        {loaded ? <WelcomeFlow setup={setup} update={setupStore.update} onComplete={completeSetup} />
          : <div className="app-loading" role="status">Opening…</div>}
      </div>
    </main>
  );
}
