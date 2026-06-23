/**
 * Pure heuristics for detecting bot/spam signups. NO side effects, NO DB —
 * safe to unit-test and to import from standalone scripts.
 */

/** Random base64-ish names like "KRIgLssCUBhsCiQUfMM" — NOT real names. */
export function looksGibberish(name: string | null): boolean {
  if (!name) return false;
  const n = name.trim();
  const letters = n.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 8) return false;
  const noSpace = !/\s/.test(n);
  const vowels = (n.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowels / letters.length;
  // Count lowercase -> uppercase transitions (camel-noise like xYxYxY).
  let caseFlips = 0;
  for (let i = 1; i < n.length; i++) {
    if (/[a-z]/.test(n[i - 1]) && /[A-Z]/.test(n[i])) caseFlips++;
  }
  return noSpace && (caseFlips >= 3 || vowelRatio < 0.25);
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
