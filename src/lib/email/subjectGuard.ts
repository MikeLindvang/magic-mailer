// src/lib/email/subjectGuard.ts
const BANNED_PATTERNS: Array<[RegExp, number]> = [
  [/\bunleash(ed|ing)?\b/i, 2],
  [/\bunlock(ed|ing)?\b/i, 1],
  [/\bultimate\b/i, 2],
  [/\bsky\s*rocket(s|ed|ing)?\b/i, 3],
  [/\bgame[-\s]?changer\b/i, 2],
  [/\brevolution(ar(y|ize|ising|izing))?\b/i, 2],
  [/\bsecret(s)?\b/i, 1],
  [/\bhack(s|ing)?\b/i, 1],
  [/\bdominate|crush|killer\b/i, 2],
  [/\binsane|crazy\b/i, 1],
  [/\b(next\s*level|10x|x10|masterclass|life[-\s]?changing)\b/i, 2],
  [/\bclick here\b/i, 3],
  [/[🚀🔥💥✨🤯]/, 2]
];

function penaltyMultiplier(hypeLevel: 1|2|3|4|5 = 3) {
  return ({1: 1.2, 2: 1.0, 3: 0.8, 4: 0.6, 5: 0.5} as const)[hypeLevel];
}

/** "Human-ish" scoring that keeps hype but nudges off stale lexemes */
export function scoreSubject(
  subject: string,
  contextHints: string[] = [],
  hypeLevel: 1|2|3|4|5 = 3
) {
  const mult = penaltyMultiplier(hypeLevel);
  let score = 0;
  const s = subject.trim();
  const lower = s.toLowerCase();

  // Positives (reward specificity & time hooks)
  if (/\d/.test(s)) score += 1; // concrete number/time/quantity
  if (/[—–-]/.test(s)) score += 0.4; // natural punctuation variety
  if (/\b(today|tonight|this week|by (mon|tue|wed|thu|fri|saturday|sunday))\b/i.test(s)) score += 0.4;
  if (contextHints.some(t => t && lower.includes(t.toLowerCase()))) score += 1.5;

  // Soft penalties (not bans)
  for (const [rx, p] of BANNED_PATTERNS) if (rx.test(s)) score -= p * mult;
  if (s.length > 60) score -= 2 * mult;
  if (/[!?]{2,}/.test(s)) score -= 1 * mult;
  if (/\b[A-Z]{3,}\b/.test(s) && !/\b(AI|PDF|API|SEO|CTA|HTML)\b/.test(s)) score -= 0.5 * mult;

  // Mild genericity nudge
  if (/better|faster|easier|smarter|productivity|results/i.test(s) && !/\d/.test(s)) score -= 0.5 * mult;

  return score;
}

/** Pull a small set of hints from context to reward specificity */
export function extractContextHints(contextPack: string): string[] {
  const hints = new Set<string>();
  const add = (w: string) => w && hints.add(w.trim());

  const mName = contextPack.match(/Project(?:\s*Name)?:\s*([^\n]+)/i);
  if (mName) add(mName[1]);

  // grab up to ~12 capitalized tokens (brands/features/etc.)
  (contextPack.match(/\b([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+)*)\b/g) || [])
    .slice(0, 12)
    .forEach(add);

  // seed some common useful tokens
  ['outline','draft','chapters','GetResponse','nonfiction','email','open rate','click-through','weekend','AI']
    .forEach(add);

  return Array.from(hints).slice(0, 15);
}
