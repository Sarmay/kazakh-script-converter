import { DEFAULT_LOAN_ROOTS, DEFAULT_NATIVE_ROOTS } from "./lexicon";
import type { CyrillicToArabicOptions } from "./types";

type Harmony = "front" | "back";

const PROPER_NOUNS: Record<string, string> = {
  "жіө": "جىيىو"
};

const COMMON_WORDS: Record<string, string> = {
  "тиіс": "تىيىس",
  "тиісті": "تىيىستى",
  "бірақ": "بىراق",
  "қоян": "قوىيان",
  "үшін": "ۇشىن"
};

const CONSONANTS: Record<string, string> = {
  "б": "ب",
  "в": "ۆ",
  "г": "گ",
  "ғ": "ع",
  "д": "د",
  "ж": "ج",
  "з": "ز",
  "й": "ي",
  "к": "ك",
  "қ": "ق",
  "л": "ل",
  "м": "م",
  "н": "ن",
  "ң": "ڭ",
  "п": "پ",
  "р": "ر",
  "с": "س",
  "т": "ت",
  "ф": "ف",
  "х": "ح",
  "һ": "ھ",
  "ч": "چ",
  "ш": "ش"
};

const VOWELS: Record<string, string> = {
  "а": "ا",
  "ә": "ا",
  "е": "ە",
  "о": "و",
  "ө": "و",
  "ұ": "ۇ",
  "ү": "ۇ",
  "ы": "ى",
  "і": "ى",
  "э": "ە"
};

const COMBINATIONS: Record<string, string> = {
  "ц": "تس",
  "щ": "شش",
  "ё": "يو"
};

const FRONT_VOWELS = new Set(["ә", "е", "і", "ө", "ү"]);
const BACK_VOWELS = new Set(["а", "о", "ұ", "ы", "у"]);
const I_INITIAL_NATIVE_WORDS = new Set(["иіс", "ине", "ит", "ию", "иір", "иіл", "ирі", "иық", "ин"]);
const PUNCTUATION: Record<string, string> = {
  ",": "،",
  ".": ".",
  ":": ":",
  ";": "؛",
  "?": "؟",
  "!": "!"
};

class TrieNode {
  children = new Map<string, TrieNode>();
  isEndOfWord = false;
  isLoanword = false;
  harmony: Harmony | null = null;
}

class KazakhTrie {
  readonly root = new TrieNode();

  private determineHarmony(word: string): Harmony {
    const wordLower = word.toLowerCase();

    if ([...wordLower].some((char) => char === "к" || char === "г")) {
      return "front";
    }

    if ([...wordLower].some((char) => char === "қ" || char === "ғ")) {
      return "back";
    }

    for (const char of wordLower) {
      if (FRONT_VOWELS.has(char)) {
        return "front";
      }

      if (BACK_VOWELS.has(char)) {
        return "back";
      }
    }

    return "back";
  }

  insert(word: string, isLoanword = false): void {
    let node = this.root;
    const wordLower = word.toLowerCase();

    for (const char of wordLower) {
      let next = node.children.get(char);
      if (!next) {
        next = new TrieNode();
        node.children.set(char, next);
      }
      node = next;
    }

    node.isEndOfWord = true;
    node.isLoanword = isLoanword;
    node.harmony = this.determineHarmony(wordLower);
  }

  loadDictionary(nativeWords: string[], loanWords: string[]): void {
    for (const word of nativeWords) {
      this.insert(word, false);
    }

    for (const word of loanWords) {
      this.insert(word, true);
    }
  }
}

class CompoundSplitter {
  constructor(private readonly trie: KazakhTrie) {}

  splitWord(word: string): Array<[string, boolean]> {
    const wordLower = word.toLowerCase();
    const parts: Array<[string, boolean]> = [];
    let index = 0;

    while (index < wordLower.length) {
      let node = this.trie.root;
      let matchLength = 0;
      let isLoan = false;

      for (let cursor = index; cursor < wordLower.length; cursor += 1) {
        const char = wordLower[cursor];
        const next = node.children.get(char);

        if (!next) {
          break;
        }

        node = next;
        if (node.isEndOfWord) {
          matchLength = cursor - index + 1;
          isLoan = node.isLoanword;
        }
      }

      if (matchLength > 0) {
        parts.push([wordLower.slice(index, index + matchLength), isLoan]);
        index += matchLength;
        continue;
      }

      const remaining = wordLower.slice(index);
      parts.push([remaining, this.fallbackIsLoanword(remaining)]);
      break;
    }

    return parts;
  }

  fallbackIsLoanword(word: string): boolean {
    return [...word.toLowerCase()].some((char) => ["ф", "в", "ц", "ч", "щ"].includes(char));
  }
}

function hasKey(map: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, key);
}

export class CyrillicToArabicConverter {
  readonly HAMZA = "\u0674";
  private readonly trie = new KazakhTrie();
  private readonly splitter = new CompoundSplitter(this.trie);

  constructor(options: CyrillicToArabicOptions = {}) {
    const nativeRoots = [...DEFAULT_NATIVE_ROOTS, ...(options.lexicon?.nativeRoots ?? [])];
    const loanRoots = [...DEFAULT_LOAN_ROOTS, ...(options.lexicon?.loanRoots ?? [])];
    this.trie.loadDictionary(nativeRoots, loanRoots);
  }

  private getInitialHarmony(word: string): Harmony {
    const wordLower = word.toLowerCase();

    if ([...wordLower].some((char) => char === "қ" || char === "ғ")) {
      return "back";
    }

    if ([...wordLower].some((char) => char === "к" || char === "г")) {
      return "front";
    }

    if (I_INITIAL_NATIVE_WORDS.has(wordLower)) {
      return "front";
    }

    for (const char of wordLower) {
      if (FRONT_VOWELS.has(char)) {
        return "front";
      }

      if (BACK_VOWELS.has(char)) {
        return "back";
      }
    }

    return "back";
  }

  private applyHamzaRule(arabicResult: string, firstSegText: string, firstSegIsLoan: boolean, isSuffix = false): string {
    if (arabicResult.includes(this.HAMZA) || !firstSegText || isSuffix) {
      return arabicResult;
    }

    const firstSegLower = firstSegText.toLowerCase();
    if (firstSegIsLoan || this.splitter.fallbackIsLoanword(firstSegLower)) {
      return arabicResult;
    }

    if ([...I_INITIAL_NATIVE_WORDS].some((word) => firstSegLower.startsWith(word))) {
      return arabicResult.startsWith(this.HAMZA) ? arabicResult : `${this.HAMZA}${arabicResult}`;
    }

    if ([...firstSegLower].some((char) => char === "к" || char === "г")) {
      return arabicResult;
    }

    const eHamzaWhitelist = new Set(["өзен", "өте", "өнер", "ине", "әлем"]);
    if (firstSegLower.includes("е") && !eHamzaWhitelist.has(firstSegLower)) {
      return arabicResult;
    }

    if (this.getInitialHarmony(firstSegLower) === "front") {
      return arabicResult.startsWith(this.HAMZA) ? arabicResult : `${this.HAMZA}${arabicResult}`;
    }

    return arabicResult;
  }

  convertWord(word: string, isSuffix = false): string {
    if (!word) {
      return word;
    }

    const wordLower = word.toLowerCase();

    if (hasKey(PROPER_NOUNS, wordLower)) {
      return PROPER_NOUNS[wordLower];
    }

    if (hasKey(COMMON_WORDS, wordLower)) {
      return COMMON_WORDS[wordLower];
    }

    const segments = this.splitter.splitWord(wordLower);
    const isLoanFlags: boolean[] = [];
    const isFrontFlags: boolean[] = [];
    const isHardLoanFlags: boolean[] = [];

    for (const [segText, isLoan] of segments) {
      let isHardLoan = false;
      let segFront = false;

      if (isLoan) {
        isHardLoan = [...segText].some((char) => "аоұы".includes(char)) || ![...segText].some((char) => "әеіөү".includes(char));
        segFront = !isHardLoan;
      } else {
        segFront = this.getInitialHarmony(segText) === "front";
      }

      isLoanFlags.push(...Array(segText.length).fill(isLoan));
      isFrontFlags.push(...Array(segText.length).fill(segFront));
      isHardLoanFlags.push(...Array(segText.length).fill(isHardLoan));
    }

    const result: string[] = [];

    for (let index = 0; index < wordLower.length; index += 1) {
      const char = wordLower[index];
      const prevChar = index > 0 ? wordLower[index - 1] : "";
      const isLoanword = isLoanFlags[index];
      const isHardLoan = isHardLoanFlags[index];

      if (char === "ь" || char === "ъ") {
        continue;
      }

      if (char === "у") {
        result.push("ۋ");
        continue;
      }

      if (char === "и") {
        if (wordLower.includes("машина")) {
          result.push("ي");
        } else if (wordLower.includes("конституция") && index < wordLower.indexOf("ц")) {
          result.push("ي");
        } else if (isLoanword) {
          result.push(isHardLoan ? "ىي" : "ي");
        } else if (index === 0) {
          result.push("ي");
        } else {
          result.push("ىي");
        }
        continue;
      }

      if (char === "я") {
        if (prevChar === "и") {
          if (isLoanword) {
            const prevPrev = index >= 2 ? wordLower[index - 2] : "";
            result.push(prevPrev === "г" || prevPrev === "к" ? "ا" : "يا");
          } else {
            result.push("ا");
          }
          continue;
        }

        result.push("يا");
        continue;
      }

      if (char === "ю") {
        if (prevChar === "ь" || prevChar === "ъ") {
          result.push("يۋ");
        } else {
          result.push(isLoanword || prevChar === "и" ? "ۋ" : "يۋ");
        }
        continue;
      }

      if (hasKey(COMBINATIONS, char)) {
        result.push(COMBINATIONS[char]);
      } else if (hasKey(CONSONANTS, char)) {
        result.push(CONSONANTS[char]);
      } else if (hasKey(VOWELS, char)) {
        result.push(VOWELS[char]);
      } else {
        result.push(char);
      }
    }

    const converted = result.join("");
    return this.applyHamzaRule(converted, segments[0]?.[0] ?? "", segments[0]?.[1] ?? false, isSuffix);
  }

  convertCompoundWord(word: string): string {
    if (!word) {
      return word;
    }

    const wordLower = word.toLowerCase();

    if (hasKey(PROPER_NOUNS, wordLower)) {
      return PROPER_NOUNS[wordLower];
    }

    if (hasKey(COMMON_WORDS, wordLower)) {
      return COMMON_WORDS[wordLower];
    }

    if (!word.includes("-")) {
      return this.convertWord(wordLower);
    }

    const parts = wordLower.split("-");
    const converted = [this.convertWord(parts[0])];

    for (const part of parts.slice(1)) {
      converted.push(this.convertWord(part, true));
    }

    return converted.join("-");
  }

  convert(text: string): string {
    let convertedText = text;

    for (const [cyr, arab] of Object.entries(PUNCTUATION)) {
      convertedText = convertedText.split(cyr).join(arab);
    }

    const pattern = /[а-яәіңғүұқөһёэъь]+(?:-[а-яәіңғүұқөһёэъь]+)*/giu;
    return convertedText.replace(pattern, (match) => this.convertCompoundWord(match));
  }
}

export function syr2arb(text: string, options?: CyrillicToArabicOptions): string {
  return new CyrillicToArabicConverter(options).convert(text);
}
