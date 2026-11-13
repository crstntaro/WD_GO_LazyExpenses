// Category colors reinforce the text labels; user-defined categories stay intact.
const tones: Record<string,string> = {
  "food & drinks":"food", transport:"transport", groceries:"groceries", shopping:"shopping",
  "bills & utilities":"bills", health:"health", home:"home", leisure:"leisure", other:"other",
};
export function categoryTone(category:string) { return tones[category.trim().toLocaleLowerCase("en-PH")] ?? "custom"; }
