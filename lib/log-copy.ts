export const LOG_COPY = [
  { greeting: "Hey, {name}.", anonymous: "Hey there.", title: "What did you spend?" },
  { greeting: "Good to see you, {name}.", anonymous: "Good to see you.", title: "Where did it go?" },
  { greeting: "Your call, {name}.", anonymous: "Your call.", title: "What do you remember?" },
  { greeting: "Welcome back, {name}.", anonymous: "Welcome back.", title: "Any recent spends?" },
  { greeting: "Hey, {name}. Let’s check in.", anonymous: "Let’s check in.", title: "What went out today?" },
  { greeting: "Over to you, {name}.", anonymous: "Over to you.", title: "Bought something?" },
  { greeting: "Hey, {name}. I’m on the case.", anonymous: "I’m on the case.", title: "Anything to log?" },
  { greeting: "One little check-in, {name}.", anonymous: "One little check-in.", title: "What did you pick up?" },
] as const;
export function chooseLogCopy(previous = -1, random = Math.random()) {
  const available = LOG_COPY.map((_, index) => index).filter(index => index !== previous);
  return available[Math.min(available.length - 1, Math.max(0, Math.floor(random * available.length)))];
}
export function logCopy(index: number, name: string) {
  const copy = LOG_COPY[index] ?? LOG_COPY[0];
  return { title: copy.title, greeting: name.trim() ? copy.greeting.replace("{name}", name.trim()) : copy.anonymous };
}
