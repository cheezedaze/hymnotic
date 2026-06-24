/**
 * Pure heuristics for detecting bot/spam signups. NO side effects, NO DB —
 * safe to unit-test and to import from standalone scripts.
 */

/**
 * Random mixed-case base64-style names like "KRIgLssCUBhsCiQUfMM" — NOT real
 * names. The reliable signal is many lowercase->uppercase transitions: real
 * names (even consonant-dense or non-English, e.g. "Krzysztof") are Title Case
 * or lowercase and have none. (Vowel density is deliberately NOT used — it
 * false-positives on real names and this gates account deletion.)
 */
export function looksGibberish(name: string | null): boolean {
  if (!name) return false;
  const n = name.trim();
  const letters = n.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 8) return false;
  const noSpace = !/\s/.test(n);
  let caseFlips = 0;
  for (let i = 1; i < n.length; i++) {
    if (/[a-z]/.test(n[i - 1]) && /[A-Z]/.test(n[i])) caseFlips++;
  }
  return noSpace && caseFlips >= 3;
}

/** Number of dots in the local part of a gmail/googlemail address. */
export function gmailDotCount(email: string): number {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || !/^(gmail\.com|googlemail\.com)$/.test(domain)) return 0;
  return (local.match(/\./g) || []).length;
}

/** Canonical gmail inbox (dots removed, +suffix stripped) for collision detection. */
export function gmailCanonical(email: string): string | null {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain || !/^(gmail\.com|googlemail\.com)$/.test(domain)) return null;
  return local.split("+")[0].replace(/\./g, "") + "@gmail.com";
}
