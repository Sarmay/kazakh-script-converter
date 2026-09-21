import { collectTokenCandidates, DEFAULT_HOMOGRAPHS, DEFAULT_TYPO_CANDIDATES } from "./candidates";
import { defaultCharacterNgramScorer } from "./ngram";
import type { ContextDisambiguator, MaybePromise, RawToken, SentenceScorer, SentenceScorerLike } from "./types";

function isPromiseLike<T>(value: MaybePromise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

export class NoopDisambiguator implements ContextDisambiguator {
  disambiguate(rawTokens: readonly RawToken[]): string[] {
    return rawTokens.map(([, converted]) => converted);
  }
}

function resolveScorer(scorer: SentenceScorerLike): SentenceScorer {
  if (typeof scorer === "function") {
    return { score: scorer };
  }

  return scorer;
}

export interface CandidateDisambiguatorOptions {
  scorer: SentenceScorerLike;
  homographs?: Record<string, readonly string[]>;
  typoCandidates?: Record<string, readonly string[]>;
}

export class CandidateDisambiguator implements ContextDisambiguator {
  private readonly scorer: SentenceScorer;
  private readonly homographs: Record<string, readonly string[]>;
  private readonly typoCandidates: Record<string, readonly string[]>;

  constructor(options: CandidateDisambiguatorOptions) {
    this.scorer = resolveScorer(options.scorer);
    this.homographs = options.homographs ?? DEFAULT_HOMOGRAPHS;
    this.typoCandidates = options.typoCandidates ?? DEFAULT_TYPO_CANDIDATES;
  }

  disambiguate(rawTokens: readonly RawToken[]): MaybePromise<string[]> {
    const resolved = rawTokens.map(([, converted]) => converted);
    const targetIndices: number[] = [];

    rawTokens.forEach(([arabicWord, converted], index) => {
      const candidates = collectTokenCandidates(arabicWord, converted, this.homographs, this.typoCandidates);
      const isTypo = Boolean(this.typoCandidates[arabicWord]);
      if (candidates.length > 1 && (rawTokens.length > 1 || isTypo)) {
        targetIndices.push(index);
      }
    });

    if (targetIndices.length === 0) {
      return resolved;
    }

    const rankIndex = (targetIndex: number): MaybePromise<void> => {
      const [arabicWord, converted] = rawTokens[targetIndex];
      const candidates = collectTokenCandidates(arabicWord, converted, this.homographs, this.typoCandidates);
      const sentences = candidates.map((candidate) => {
        const nextTokens = [...resolved];
        nextTokens[targetIndex] = candidate;
        return nextTokens.join(" ");
      });

      const scores = sentences.map((sentence) => this.scorer.score(sentence));
      if (scores.some(isPromiseLike)) {
        return Promise.all(scores).then((values) => {
          resolved[targetIndex] = candidates[argmin(values)] ?? converted;
        });
      }

      resolved[targetIndex] = candidates[argmin(scores as number[])] ?? converted;
      return undefined;
    };

    const steps = targetIndices.map((index) => rankIndex(index));
    if (steps.some(isPromiseLike)) {
      return Promise.all(steps).then(() => resolved);
    }

    return resolved;
  }
}

function argmin(values: readonly number[]): number {
  let bestIndex = 0;
  let bestValue = Number.POSITIVE_INFINITY;

  for (let index = 0; index < values.length; index += 1) {
    if (values[index] < bestValue) {
      bestValue = values[index];
      bestIndex = index;
    }
  }

  return bestIndex;
}

export interface LightDisambiguatorOptions {
  scorer?: SentenceScorerLike;
}

export class LightDisambiguator extends CandidateDisambiguator {
  constructor(options: LightDisambiguatorOptions = {}) {
    super({
      scorer: options.scorer ?? defaultCharacterNgramScorer
    });
  }
}
