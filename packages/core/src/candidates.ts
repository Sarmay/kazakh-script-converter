export const DEFAULT_HOMOGRAPHS: Record<string, readonly string[]> = {
  "الما": ["алма", "әлме"],
  "اكە": ["әке", "ака"],
  "اكەم": ["әкем", "акам"],
  "اكەسى": ["әкесі", "акасы"],
  "اكەڭ": ["әкең", "акаң"],
  "بىر": ["бір", "бұр"]
};

export const DEFAULT_TYPO_CANDIDATES: Record<string, readonly string[]> = {
  "نٵۋرىز": ["наурыз", "нәуріз"],
  "تۇرلى": ["түрлі", "тұрлы"],
  "داستۇرلەر": ["дәстүрлер", "дастұрлер"],
  "كوكپار": ["көкпар", "көкпәр"],
  "سياقتى": ["сияқты", "сияқті"],
  "پەنويىن-ساۋىق": ["пен ойын-сауық", "пенөйін-сауық"]
};

export function lookupAmbiguousCandidates(
  arabicWord: string,
  homographs: Record<string, readonly string[]> = DEFAULT_HOMOGRAPHS,
  typoCandidates: Record<string, readonly string[]> = DEFAULT_TYPO_CANDIDATES
): readonly string[] | undefined {
  return homographs[arabicWord] ?? typoCandidates[arabicWord];
}

export function applyCandidateCasing(ruleOutput: string, candidate: string): string {
  if (!ruleOutput || !candidate) {
    return candidate;
  }

  const first = ruleOutput[0];
  if (first !== first.toUpperCase() || first === first.toLowerCase()) {
    return candidate;
  }

  return `${candidate[0].toUpperCase()}${candidate.slice(1)}`;
}

export function collectTokenCandidates(
  arabicWord: string,
  ruleOutput: string,
  homographs: Record<string, readonly string[]> = DEFAULT_HOMOGRAPHS,
  typoCandidates: Record<string, readonly string[]> = DEFAULT_TYPO_CANDIDATES
): string[] {
  const extras = lookupAmbiguousCandidates(arabicWord, homographs, typoCandidates);
  if (!extras) {
    return [ruleOutput];
  }

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const raw of [ruleOutput, ...extras]) {
    const next = applyCandidateCasing(ruleOutput, raw);
    const key = next.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push(next);
  }

  return candidates;
}
