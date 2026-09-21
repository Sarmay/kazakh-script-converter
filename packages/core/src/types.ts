export interface LexiconData {
  nativeRoots?: string[];
  loanRoots?: string[];
}

export type MaybePromise<T> = T | Promise<T>;

export type RawToken = readonly [source: string, converted: string];
export type NameYSequenceStyle = "normalize" | "preserve";

export interface SentenceScorer {
  score(sentence: string): MaybePromise<number>;
}

export type SentenceScorerLike = SentenceScorer | ((sentence: string) => MaybePromise<number>);

export interface ContextDisambiguator {
  disambiguate(rawTokens: readonly RawToken[], contextSentence: string): MaybePromise<string[]>;
}

export interface CyrillicToArabicOptions {
  lexicon?: LexiconData;
}

export interface ArabicToCyrillicOptions {
  useLm?: boolean;
  disambiguator?: ContextDisambiguator;
  nameYSequenceStyle?: NameYSequenceStyle;
}
