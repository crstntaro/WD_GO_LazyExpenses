import { validAccounts, type PaymentAccount } from "./accounts";

export const SETUP_KEY = "whereditgo-setup-v1";
export const GOALS = ["understand", "budget", "catch-up"] as const;
export type Goal = typeof GOALS[number];
export type Setup = {
  version: 1;
  step: 0 | 1 | 2 | 3 | 4;
  name: string;
  goal: Goal;
  budgetEnabled: boolean;
  budgetInput: string;
  completed: boolean;
  accent?: "coral" | "iris" | "lime" | "custom";
  accentColor?: string;
  learningEnabled?: boolean;
  reduceMotion?: boolean;
  reduceTransparency?: boolean;
  confirmationSeconds?: 0 | 8 | 15;
  accounts?: PaymentAccount[];
  defaultAccountId?: string;
};

export const INITIAL_SETUP: Setup = {
  version: 1, step: 0, name: "", goal: "understand",
  budgetEnabled: false, budgetInput: "", completed: false,
};

export function budgetCents(input: string): number | null {
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(input.trim())) return null;
  const amount = Number(input.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount <= 99999999
    ? Math.round(amount * 100) : null;
}

export function isSetup(value: unknown): value is Setup {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Setup>;
  return s.version === 1 && [0, 1, 2, 3, 4].includes(s.step as number) &&
    typeof s.name === "string" && s.name.length <= 40 &&
    GOALS.includes(s.goal as Goal) && typeof s.budgetEnabled === "boolean" &&
    typeof s.budgetInput === "string" && s.budgetInput.length <= 20 &&
    typeof s.completed === "boolean" &&
    (s.accent === undefined || ["coral", "iris", "lime", "custom"].includes(s.accent)) &&
    (s.accentColor === undefined || (typeof s.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(s.accentColor))) &&
    (s.accent !== "custom" || typeof s.accentColor === "string") &&
    (s.learningEnabled === undefined || typeof s.learningEnabled === "boolean") &&
    (s.reduceMotion === undefined || typeof s.reduceMotion === "boolean") &&
    (s.reduceTransparency === undefined || typeof s.reduceTransparency === "boolean") &&
    (s.confirmationSeconds === undefined || [0, 8, 15].includes(s.confirmationSeconds)) &&
    (s.accounts === undefined || validAccounts(s.accounts)) &&
    (s.defaultAccountId === undefined || s.defaultAccountId === "" || (typeof s.defaultAccountId === "string" && Boolean(s.accounts?.some((account) => account.id === s.defaultAccountId && !account.archived)))) &&
    (!s.completed || !s.budgetEnabled || budgetCents(s.budgetInput) !== null);
}

type Snapshot = { setup: Setup; loaded: boolean; warning: string };
const initialSnapshot: Snapshot = { setup: INITIAL_SETUP, loaded: false, warning: "" };

export function createSetupStore(storage: () => Pick<Storage, "getItem" | "setItem">) {
  let snapshot = initialSnapshot;
  let lastSaved: string | null | undefined;
  const listeners = new Set<() => void>();
  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function read() {
    if (snapshot.warning) return;
    try {
      const raw = storage().getItem(SETUP_KEY);
      if (snapshot.loaded && raw === lastSaved) return;
      const setup: unknown = raw === null ? INITIAL_SETUP : JSON.parse(raw);
      if (!isSetup(setup)) throw new Error("Unrecognized setup");
      lastSaved = raw;
      publish({ setup, loaded: true, warning: "" });
    } catch {
      publish({ ...snapshot, loaded: true, warning:
        "Your saved setup couldn't be read. It hasn't been overwritten. Setup changes will only last for this visit." });
    }
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initialSnapshot,
    read,
    subscribe(listener: () => void) {
      listeners.add(listener);
      read();
      return () => { listeners.delete(listener); };
    },
    update(patch: Partial<Setup>) {
      read();
      const setup = { ...snapshot.setup, ...patch };
      if (!isSetup(setup)) return;
      let warning = snapshot.warning;
      if (!warning) {
        try {
          const raw = JSON.stringify(setup);
          storage().setItem(SETUP_KEY, raw);
          lastSaved = raw;
        } catch {
          warning = "This browser isn't saving your setup. Your progress will only last for this visit.";
        }
      }
      publish({ setup, loaded: true, warning });
    },
  };
}
