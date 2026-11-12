import { STORAGE_KEY, isTransaction, type Transaction } from "./finance";

type Snapshot = {
  transactions: Transaction[];
  loaded: boolean;
  storageWarning: string;
};

const initialSnapshot: Snapshot = {
  transactions: [],
  loaded: false,
  storageWarning: "",
};

// Cached snapshots let React subscribe to browser storage without a load/save
// effect pair that could accidentally write an empty list during hydration.
export function createTransactionStore(
  storage: () => Pick<Storage, "getItem" | "setItem">,
) {
  let snapshot = initialSnapshot;
  let lastSaved: string | null | undefined;
  const listeners = new Set<() => void>();

  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function read() {
    // Keep unsaved in-memory changes and protect unreadable saved data.
    if (snapshot.storageWarning) return;

    try {
      const saved = storage().getItem(STORAGE_KEY);
      if (snapshot.loaded && saved === lastSaved) return;

      const parsed: unknown = saved === null ? [] : JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isTransaction)) {
        throw new Error("Unrecognized transaction format");
      }

      lastSaved = saved;
      publish({ transactions: parsed, loaded: true, storageWarning: "" });
    } catch {
      publish({
        ...snapshot,
        loaded: true,
        storageWarning:
          "Saved entries couldn't be read. They haven't been overwritten. Changes in this session won't be saved.",
      });
    }
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initialSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      read();
      return () => { listeners.delete(listener); };
    },
    read,
    update(update: (items: Transaction[]) => Transaction[]) {
      // Re-read before editing so an open second tab's changes are retained.
      read();
      const transactions = update(snapshot.transactions);
      let storageWarning = snapshot.storageWarning;

      if (!storageWarning) {
        try {
          const serialized = JSON.stringify(transactions);
          storage().setItem(STORAGE_KEY, serialized);
          lastSaved = serialized;
        } catch {
          storageWarning =
            "This browser couldn't save changes. Changes are only in this session; avoid refreshing or closing this tab.";
        }
      }

      publish({ transactions, loaded: true, storageWarning });
    },
  };
}
