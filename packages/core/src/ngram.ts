import { BIGRAM_TOTAL, CHAR_BIGRAMS, CHAR_TRIGRAMS, TRIGRAM_TOTAL, WORD_TOTAL, WORD_UNIGRAMS } from "./ngram-data";
import type { SentenceScorer } from "./types";

const CHAR_SMOOTHING = 0.05;
const WORD_SMOOTHING = 0.1;
const WORD_WEIGHT = 0.35;
const CHAR_WEIGHT = 0.65;

function logProb(count: number, total: number, vocab: number, smoothing: number): number {
  return Math.log((count + smoothing) / (total + smoothing * vocab));
}

export class CharacterNgramScorer implements SentenceScorer {
  score(sentence: string): number {
    const normalized = sentence.toLowerCase().replace(/\s+/gu, " ").trim();
    if (!normalized) {
      return Number.POSITIVE_INFINITY;
    }

    const words = normalized.match(/[a-zа-яәіңғүұқөһёэъь]+/giu) ?? [];
    let wordLoss = 0;

    if (words.length > 0) {
      const vocab = Object.keys(WORD_UNIGRAMS).length || 1;
      for (const word of words) {
        wordLoss -= logProb(WORD_UNIGRAMS[word] ?? 0, WORD_TOTAL, vocab, WORD_SMOOTHING);
      }
      wordLoss /= words.length;
    }

    const padded = `^^${normalized}$`;
    const charVocab = Object.keys(CHAR_TRIGRAMS).length || 1;
    let charLoss = 0;
    let charCount = 0;

    for (let index = 0; index < padded.length - 2; index += 1) {
      const tri = padded.slice(index, index + 3);
      const bi = padded.slice(index, index + 2);
      const triCount = CHAR_TRIGRAMS[tri] ?? 0;
      const biCount = CHAR_BIGRAMS[bi] ?? 0;
      charLoss -= logProb(triCount, biCount || TRIGRAM_TOTAL / Math.max(BIGRAM_TOTAL, 1), charVocab, CHAR_SMOOTHING);
      charCount += 1;
    }

    if (charCount > 0) {
      charLoss /= charCount;
    }

    return WORD_WEIGHT * wordLoss + CHAR_WEIGHT * charLoss;
  }
}

export const defaultCharacterNgramScorer = new CharacterNgramScorer();
