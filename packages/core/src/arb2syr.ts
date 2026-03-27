import { NoopDisambiguator } from "./disambiguation";
import type { ArabicToCyrillicOptions, ContextDisambiguator, RawToken } from "./types";

type WordMatchType = "exception" | "proper" | "loanword" | "anonymous" | null;
type HarmonyState = "soft" | "hard";

const CONSONANTS: Record<string, string> = {
  "ب": "б",
  "ۆ": "в",
  "گ": "г",
  "ع": "ғ",
  "د": "д",
  "ج": "ж",
  "ز": "з",
  "ك": "к",
  "ق": "қ",
  "ل": "л",
  "م": "м",
  "ن": "н",
  "ڭ": "ң",
  "پ": "п",
  "ر": "р",
  "س": "с",
  "ت": "т",
  "ف": "ф",
  "ح": "х",
  "ھ": "һ",
  "چ": "ч",
  "ش": "ш"
};

const VOWEL_MAP: Record<string, string | { b: string; f: string }> = {
  "ا": { b: "а", f: "ә" },
  "ى": { b: "ы", f: "і" },
  "و": { b: "о", f: "ө" },
  "ۇ": { b: "ұ", f: "ү" },
  "ە": "е",
  "ۋ": "у"
};

const EXCEPTIONS: Record<string, string> = {
  "رەسپۋبليكا": "республика",
  "كوممۋنيستىك": "коммунистік",
  "ەكران": "экран",
  "ەنەرگەتيكا": "энергетика",
  "ەنەرگييا": "энергия",
  "كوميتەت": "комитет",
  "كونتسەرت": "концерт",
  "كوسموس": "космос",
  "كوللەكتىيۆ": "коллектив",
  "كوللەگا": "коллега",
  "كورپۋس": "корпус",
  "كونستىيتۋتسييا": "конституция",
  "كوممۋنيست": "коммунист",
  "رايون": "район",
  "راديو": "радио",
  "كارتا": "карта",
  "ارحىيتەكتۋرا": "архитектура",
  "اۆتونوميا": "автономия",
  "ۆىيديو": "видео",
  "ۆىيدەو": "видео",
  "بىيولوگيا": "биология",
  "كوەففيتسىيەنت": "коэффициент",
  "كوەففيتسيەنت": "коэффициент",
  "پروتسەس": "процесс",
  "تەلەۆىيزور": "телевизор",
  "تەلەۆيزور": "телевизор",
  "ٴاردايىم": "әрдайым",
  "پارتيا": "партия",
  "كومپيۋتەر": "компьютер",
  "تەلەفون": "телефон",
  "ينتەرنەت": "интернет",
  "دەموكراتييا": "демократия",
  "دەموكراتيا": "демократия",
  "ەكونوميكا": "экономика",
  "پوليتيكا": "политика",
  "كورىدور": "коридор",
  "كونگرەس": "конгресс",
  "ەلەمەنت": "элемент",
  "تەحنولوگىييا": "технология",
  "تەحنولوگىيىا": "технология",
  "تەحنولوگىيا": "технология",
  "بىيولوگىييا": "биология",
  "بيولوگيا": "биология",
  "ىينسترۋمەنت": "инструмент",
  "ينسترۋمەنت": "инструмент",
  "پودەزد": "подъезд",
  "كونستيتۋتسىييا": "конституция",
  "ستانتسىييا": "станция",
  "بىر": "бір",
  "ۇش": "үш",
  "تورت": "төрт",
  "ىس": "іс",
  "ديسسەرتاتسىييا": "диссертация",
  "ديسسەرتاتسيا": "диссертация",
  "ينتەگراتسىييا": "интеграция",
  "ينتەگراتسيا": "интеграция",
  "ترانسفورماتسيا": "трансформация",
  "ماجىلىس": "мәжіліс",
  "ٴتوراعا": "төраға",
  "اكادەمىييا": "академия",
  "شىمكەنت": "Шымкент",
  "الماتى": "Алматы",
  "استانا": "Астана",
  "قازاقستان": "Қазақстан",
  "جۇڭگو": "Жұңго",
  "شي": "Си",
  "جينپيڭ": "Цзиньпин",
  "كىتاپ": "кітап",
  "راحمەت": "рахмет",
  "اۋىل": "ауыл",
  "گب": "ГБ",
  "پروگرەس": "прогресс",
  "ٴوزارا": "өзара",
  "جاۋاپكەرشىلىك": "жауапкершілік",
  "ەلەكترلەندىرۋ": "электрлендіру",
  "ٴىزباسار": "ізбасар",
  "ٴادىس-تاسىل": "әдіс-тәсіл",
  "ٴجون-جوسىقسىز": "жөн-жосықсыз",
  "كونسەپتسىييا": "концепция",
  "كونسەپتسييا": "концепция",
  "كونسەپتسيا": "концепция",
  "سىيفرلىق": "цифрлық",
  "ەۆولۋتسىييا": "эволюция",
  "ەۆوليۋتسيا": "эволюция",
  "مەٴتىلكەشە": "мәтілкеше",
  "دىياگنوز": "диагноз",
  "بۋدجەت": "бюджет",
  "فىيلم": "фильм",
  "اسفالت": "асфальт",
  "ەۋروپا": "Еуропа",
  "توكىيو": "Токио",
  "نىيۋ-يورك": "Нью-Йорк",
  "بانك": "банк",
  "قىيار": "қияр",
  "بىراق": "бірақ",
  "تومەن": "төмен",
  "مەيرام": "мейрам",
  "مەيرامدارىنىڭ": "мейрамдарының",
  "داستۇر": "дәстүр",
  "داستۇرلەر": "дәстүрлер",
  "دەنساۋلىق": "денсаулық",
  "تاريح": "тарих",
  "گرامماتىكا": "грамматика",
  "گرامماتىكالىق": "грамматикалық",
  "ج ك پ": "ЖКП",
  "اسكەري": "әскери",
  "باتىل": "батыл",
  "لي چياڭ": "Ли Чяң",
  "جاۋ لىجي": "Жау Лыжи",
  "ۋاڭ حۋنيڭ": "Уаң Хуниң",
  "ساي چي": "Сай Чи",
  "ديڭ شۋەشياڭ": "Диң Шуешяң",
  "لي شي": "Ли Си",
  "سۋبتىيتر": "субтитр",
  "سۋبتىيتىرلەردى": "субтитрлерді"
};

const LOANWORD_EXACT = new Set([
  "ۋنىيۆەرسىيتەت",
  "ۋنىيۆەرسىتەت",
  "ۋنىۆەرسىتەت",
  "ۋنىۆەرسىيتەت",
  "كونستىيتۋتسىيىا",
  "كونستىيتۋتسىييا",
  "كونستىيتۋتسىيا",
  "ستانتسىيىا",
  "ستانتسىيا",
  "ينفورماتسىييا",
  "ينفورماتسىيا",
  "ماشينا",
  "ماشىنا",
  "اتوم",
  "چەمپىيون",
  "چەمپىيۇن",
  "ششەتكا"
]);

const LOANWORD_E_PREFIXES = [
  "ەكران",
  "ەكسپ",
  "ەلەكتر",
  "ەنەرگ",
  "ەكولوگ",
  "ەتاپ",
  "ەفير",
  "ەففەكت",
  "ەكونوم",
  "ەلەمەنت",
  "ەستراد",
  "ەپوس",
  "ەپىيزود"
];

const LOANWORD_PREFIXES = [
  "ارحى",
  "ارحي",
  "پرو",
  "پروگ",
  "پروتس",
  "وزارا",
  "وزارە",
  "تەحنو",
  "ەكونوم",
  "ەكانوم",
  "گۋمان",
  "گومان",
  "راي",
  "راد",
  "ۆىيد",
  "ۆيد",
  "كوەفف",
  "كوئفف",
  "كونسەپ",
  "كونتسەپ",
  "سىيفر",
  "تسىيفر",
  "گراف",
  "ەنەرگ",
  "ەۆول",
  "ارحىيت",
  "ارحيت",
  "ينتەر",
  "كونست",
  "ستت",
  "پود",
  "كانست",
  "دەموكر",
  "دەمو",
  "پوليت",
  "تەلەف",
  "پولىيتس",
  "پوليتس",
  "دەپارت",
  "دىپارت",
  "وپەرات",
  "اوپەرات",
  "فەدەرال",
  "فىدەرال",
  "كرىيمىين",
  "كريمين",
  "پسىيحول",
  "پسيحول",
  "ۆاشىينگ",
  "ۆاشينگ",
  "امەرىيك",
  "امەريك",
  "اۆتومات",
  "ۋنىيۆەرس",
  "ۋنيۆەرس",
  "پرەزىيد",
  "پرەزيد",
  "ىينۆەست",
  "ينۆەست",
  "رەفورم",
  "دەفىيتس",
  "دەفيتس",
  "كووپەر",
  "كوپەر",
  "كونفەرەن",
  "ىينفلىيات",
  "ينفلىيات",
  "ىينفليات",
  "ينفليات",
  "كليمات",
  "ينتەللەكت",
  "گەوساياس",
  "گەوسايا",
  "مودەل",
  "دەموكرات",
  "تسون",
  "تسان",
  "تسەن",
  "تسە",
  "تسىي",
  "تسي",
  "ششە",
  "ششى",
  "ششو",
  "ماتر",
  "ماش",
  "اتوم",
  "ستات",
  "ستانت",
  "پودە",
  "گرام",
  "سۋبت"
];

const PROPER_NOUNS: Record<string, string> = {
  "قازاقستان": "Қазақстан",
  "الماتى": "Алматы",
  "استانا": "Астана",
  "اراستانا": "Астана"
};

const VALID_SUFFIXES = new Set([
  "لار",
  "لەر",
  "دار",
  "دەر",
  "تار",
  "تەر",
  "نىڭ",
  "دىڭ",
  "تىڭ",
  "عا",
  "گە",
  "قا",
  "كە",
  "نا",
  "نە",
  "ا",
  "ە",
  "نى",
  "دى",
  "تى",
  "ن",
  "دا",
  "دە",
  "تا",
  "تە",
  "ندا",
  "ندە",
  "دان",
  "دەن",
  "تان",
  "تەن",
  "نان",
  "نەن",
  "مەن",
  "بەن",
  "پەن",
  "م",
  "مىز",
  "ڭ",
  "ڭىز",
  "سى",
  "ى",
  "ىمыз",
  "ىڭىز",
  "ەمىز",
  "ەڭىز",
  "ىم",
  "ىڭ",
  "ەم",
  "ەڭ",
  "لىق",
  "لىك",
  "دىق",
  "دىك",
  "تىق",
  "تىك",
  "سىز",
  "شى",
  "شىلدىق",
  "شىلىك",
  "داعى",
  "دەگى",
  "تاعى",
  "تەگى",
  "نداعى",
  "ندەگى",
  "عان",
  "گەن",
  "قان",
  "كەن",
  "ما",
  "مە",
  "با",
  "بە",
  "پا",
  "پە",
  "پ",
  "ىپ",
  "ەپ",
  "ۋ",
  "ۋشى",
  "تۋ",
  "دۋ",
  "اسىڭ",
  "ەسىڭ",
  "ادى",
  "ەدى",
  "يدى",
  "مىن",
  "بىن",
  "پىن",
  "ار",
  "ەر",
  "ماس",
  "مەس",
  "لەندىرۋ",
  "لاندىرۋ",
  "لەنۋ",
  "لانۋ",
  "لەن",
  "لان",
  "دىرۋ",
  "دىر"
]);

const COMPOUND_PIVOT_ROOTS = [
  "سوز",
  "تىل",
  "بىلىم",
  "حانا",
  "كوز",
  "ورىن",
  "كەر",
  "قور",
  "پاز",
  "گەر",
  "شىلىك",
  "تۇستىك",
  "ساۋ",
  "سياق",
  "ويىن",
  "تۇستىگ"
];

const IMPLICIT_SOFT_ROOTS = new Set([
  "ۇمىت",
  "تۇب",
  "ۇشىن",
  "مۇمكىن",
  "بىر",
  "بىز",
  "سىز",
  "كىم",
  "تىل",
  "كۇن",
  "تۇن",
  "جۇر",
  "ىلگەرى",
  "بۇل"
]);

const ARAB_CONSONANTS_FOR_CLUSTER = "بۆگعدجزكقلمنڭپرستفحھچش";
const NATIVE_CLUSTERS = new Set([
  "قت",
  "قس",
  "قب",
  "قج",
  "قد",
  "قز",
  "لد",
  "لت",
  "لق",
  "لح",
  "لس",
  "لب",
  "لج",
  "ند",
  "نت",
  "نق",
  "نس",
  "نج",
  "نب",
  "نز",
  "ست",
  "سق",
  "سد",
  "سب",
  "سج",
  "سز",
  "شت",
  "شق",
  "شد",
  "شس",
  "رت",
  "رد",
  "رق",
  "رس",
  "رج",
  "رب",
  "رز",
  "زد",
  "زق",
  "ڭد",
  "ڭق",
  "ڭت",
  "مد",
  "مب",
  "من",
  "يت",
  "يس",
  "يق",
  "يد",
  "ىل",
  "ىن",
  "ىر",
  "ىم"
]);

function hasKey(map: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(map, key);
}

class PrefixTrieNode {
  children = new Map<string, PrefixTrieNode>();
  isEnd = false;
}

class PrefixTrie {
  private readonly root = new PrefixTrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      let next = node.children.get(char);
      if (!next) {
        next = new PrefixTrieNode();
        node.children.set(char, next);
      }
      node = next;
    }
    node.isEnd = true;
  }

  hasPrefixOf(word: string): boolean {
    let node = this.root;
    for (const char of word) {
      const next = node.children.get(char);
      if (!next) {
        return false;
      }
      node = next;
      if (node.isEnd) {
        return true;
      }
    }
    return false;
  }
}

interface RootMatch {
  matchType: WordMatchType;
  base: string | null;
  suffix: string;
}

export class ArabicToCyrillicConverter {
  readonly HAMZA = "\u0674";
  private readonly disambiguator: ContextDisambiguator;
  private readonly loanwordPrefixTrie = new PrefixTrie();
  private readonly reZwnjEtc = /[\u200B-\u200F\u202A-\u202E\uFEFF]/gu;
  private readonly reSpaces = /[ \t]+/gu;
  private readonly reHyphens = /\s*-\s*/gu;
  private readonly reRedundantYye1 = /ىييە/gu;
  private readonly reRedundantYye2 = /ييە/gu;
  private readonly reRedundantYye3 = /يية/gu;
  private readonly reUndantYa = /ىييا/gu;
  private readonly reArabicWords = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[-\s]+[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/gu;
  private readonly reCapAfterPunct = /([.。:：?？!！])\s*([a-zа-яәіңғүұқөһ])/giu;
  private readonly reCapAfterQuote = /([«"'"])\s*([a-zа-яәіңғүұқөһ])/giu;
  private readonly frontVowelsCyr = new Set(["ә", "е", "і", "ө", "ү", "э", "и"]);
  private readonly backVowelsCyr = new Set(["а", "о", "ұ", "ы", "я", "ю"]);
  private readonly arabicVowels = new Set(["ا", "ى", "و", "ۇ", "ە", "ۋ", "ي"]);

  constructor(options: ArabicToCyrillicOptions = {}) {
    if (options.useLm && !options.disambiguator) {
      throw new Error(
        "Built-in LM disambiguation is not bundled with the npm package. Provide options.disambiguator in Node.js or use the pure rule-based converter."
      );
    }

    this.disambiguator = options.disambiguator ?? new NoopDisambiguator();

    for (const prefix of LOANWORD_PREFIXES) {
      this.loanwordPrefixTrie.insert(prefix);
    }
  }

  isLoanword(word: string): boolean {
    return LOANWORD_EXACT.has(word) || this.loanwordPrefixTrie.hasPrefixOf(word) || this.hasConsonantCluster(word);
  }

  hasConsonantCluster(word: string): boolean {
    let stem = word;

    for (let length = word.length - 1; length > Math.max(2, word.length - 6); length -= 1) {
      const candidateSuffix = word.slice(length);
      if (candidateSuffix && this.isValidSuffixSequence(candidateSuffix)) {
        stem = word.slice(0, length);
        break;
      }
    }

    let consonantCount = 0;
    const chars = [...stem];

    for (let index = 0; index < chars.length; index += 1) {
      const char = chars[index];

      if (ARAB_CONSONANTS_FOR_CLUSTER.includes(char)) {
        if (consonantCount >= 1 && index >= 1) {
          const pair = `${chars[index - 1]}${char}`;
          if (NATIVE_CLUSTERS.has(pair)) {
            consonantCount = 1;
            continue;
          }
        }

        consonantCount += 1;
        if (consonantCount >= 3) {
          return true;
        }
      } else {
        consonantCount = 0;
      }
    }

    return false;
  }

  isLoanwordWithEPrefix(word: string): boolean {
    return word.startsWith("ە") && LOANWORD_E_PREFIXES.some((prefix) => word.startsWith(prefix));
  }

  getCyrillicVowelState(cyrillicWord: string): boolean {
    const cyr = cyrillicWord.toLowerCase();

    if (cyr === "кітап") {
      return true;
    }

    for (let index = cyr.length - 1; index >= 0; index -= 1) {
      const char = cyr[index];
      if (this.frontVowelsCyr.has(char)) {
        return true;
      }

      if (this.backVowelsCyr.has(char)) {
        return false;
      }
    }

    return false;
  }

  isValidSuffixSequence(suffix: string): boolean {
    if (!suffix) {
      return true;
    }

    const dp = Array<boolean>(suffix.length + 1).fill(false);
    dp[0] = true;

    for (let index = 1; index <= suffix.length; index += 1) {
      for (let start = Math.max(0, index - 10); start < index; start += 1) {
        if (dp[start] && VALID_SUFFIXES.has(suffix.slice(start, index))) {
          dp[index] = true;
          break;
        }
      }
    }

    return dp[suffix.length];
  }

  getHarmonyFromArabicRoot(word: string): HarmonyState {
    for (const root of IMPLICIT_SOFT_ROOTS) {
      if (word.startsWith(root) && ![...word].some((char) => char === "ق" || char === "ع")) {
        return "soft";
      }
    }

    let softSignals = 0;
    let hardSignals = 0;
    let hasHamza = false;

    for (const char of word) {
      if (char === this.HAMZA) {
        hasHamza = true;
      } else if (char === "ك" || char === "گ") {
        softSignals += 5;
      } else if (char === "ق" || char === "ع") {
        hardSignals += 5;
      } else if (char === "ە") {
        softSignals += 3;
      } else if ("اوۇ".includes(char)) {
        hardSignals += 2;
      }
    }

    if (hasHamza || softSignals > hardSignals) {
      return "soft";
    }

    if (hardSignals > softSignals) {
      return "hard";
    }

    return "hard";
  }

  segmentCompoundWord(word: string): string[] {
    if (word.includes("-")) {
      return word.split("-");
    }

    if (word.startsWith(this.HAMZA)) {
      return [word];
    }

    for (const pivot of COMPOUND_PIVOT_ROOTS) {
      if (word.includes(pivot) && !word.startsWith(pivot)) {
        const pivotIndex = word.indexOf(pivot);
        if (pivotIndex > 0 && word[pivotIndex - 1] !== this.HAMZA) {
          return [word.slice(0, pivotIndex), word.slice(pivotIndex)];
        }
      }
    }

    const suffixPatterns = [/(تاۋلىق(?:تار)?)$/u, /(زار)$/u, /(ستان)$/u];
    for (const pattern of suffixPatterns) {
      const match = word.match(pattern);
      if (match && match.index !== undefined && match.index > 0) {
        return [word.slice(0, match.index), word.slice(match.index)];
      }
    }

    return [word];
  }

  extractRootAndSuffix(word: string): RootMatch {
    if (!word) {
      return { matchType: null, base: null, suffix: word };
    }

    for (let length = word.length; length > 1; length -= 1) {
      const prefix = word.slice(0, length);
      const suffix = word.slice(length);

      if (!this.isValidSuffixSequence(suffix)) {
        continue;
      }

      if (hasKey(EXCEPTIONS, prefix)) {
        return { matchType: "exception", base: EXCEPTIONS[prefix], suffix };
      }

      if (hasKey(PROPER_NOUNS, prefix)) {
        return { matchType: "proper", base: PROPER_NOUNS[prefix], suffix };
      }

      if (LOANWORD_EXACT.has(prefix)) {
        return { matchType: "loanword", base: prefix, suffix };
      }
    }

    for (let length = word.length - 1; length > 1; length -= 1) {
      const prefix = word.slice(0, length);
      const suffix = word.slice(length);

      if (![...prefix].some((char) => this.arabicVowels.has(char))) {
        continue;
      }

      if (this.isValidSuffixSequence(suffix)) {
        return { matchType: "anonymous", base: prefix, suffix };
      }
    }

    return { matchType: null, base: null, suffix: word };
  }

  convertSuffixOnly(suffix: string, isFront: boolean): string {
    if (!suffix) {
      return "";
    }

    const result: string[] = [];
    let index = 0;

    while (index < suffix.length) {
      const char = suffix[index];
      const pair = suffix.slice(index, index + 2);

      if (pair === "ىي") {
        if (suffix[index + 2] === "ا") {
          result.push("ия");
          index += 3;
        } else {
          result.push("и");
          index += 2;
        }
        continue;
      }

      if (char === "ي" && index + 1 < suffix.length) {
        const nextChar = suffix[index + 1];
        if (nextChar === "ا") {
          result.push("я");
          index += 2;
          continue;
        }
        if (nextChar === "ۋ") {
          result.push("ю");
          index += 2;
          continue;
        }
      }

      if (pair === "شش") {
        result.push("щ");
        index += 2;
        continue;
      }

      if (pair === "تس") {
        result.push("ц");
        index += 2;
        continue;
      }

      if (char === this.HAMZA && index + 1 < suffix.length) {
        const nextChar = suffix[index + 1];
        if (nextChar === "ا") {
          result.push("ә");
          index += 2;
          continue;
        }
        if (nextChar === "ى") {
          result.push("і");
          index += 2;
          continue;
        }
        if (nextChar === "و") {
          result.push("ө");
          index += 2;
          continue;
        }
        if (nextChar === "ۇ") {
          result.push("ү");
          index += 2;
          continue;
        }
        index += 1;
        continue;
      }

      if (hasKey(CONSONANTS, char)) {
        result.push(CONSONANTS[char]);
        index += 1;
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(VOWEL_MAP, char)) {
        const vowel = VOWEL_MAP[char];
        result.push(typeof vowel === "string" ? vowel : isFront ? vowel.f : vowel.b);
        index += 1;
        continue;
      }

      if (char === "ي") {
        result.push(index === 0 ? "й" : "اىوۇەۋ".includes(suffix[index - 1]) ? "й" : "и");
        index += 1;
        continue;
      }

      result.push(char);
      index += 1;
    }

    return result.join("");
  }

  convertWord(word: string): string {
    if (!word) {
      return word;
    }

    if (hasKey(EXCEPTIONS, word)) {
      return EXCEPTIONS[word];
    }

    if (hasKey(PROPER_NOUNS, word)) {
      return PROPER_NOUNS[word];
    }

    if (LOANWORD_EXACT.has(word)) {
      return this.convertWordInternal(word);
    }

    const wholeWordIsFront = this.getHarmonyFromArabicRoot(word) === "soft";
    const forcedState: HarmonyState = wholeWordIsFront ? "soft" : "hard";
    const { matchType, base, suffix } = this.extractRootAndSuffix(word);

    if ((matchType === "exception" || matchType === "proper") && base) {
      return `${base}${this.convertSuffixOnly(suffix, this.getCyrillicVowelState(base))}`;
    }

    if (matchType === "loanword" && base) {
      const baseCyr = this.convertWordInternal(base);
      return `${baseCyr}${this.convertSuffixOnly(suffix, this.getCyrillicVowelState(baseCyr))}`;
    }

    if (matchType === "anonymous" && base) {
      if (this.isLoanword(base)) {
        const baseCyr = this.convertWordInternal(base);
        return `${baseCyr}${this.convertSuffixOnly(suffix, this.getCyrillicVowelState(baseCyr))}`;
      }

      const baseCyr = this.convertWordInternal(base, forcedState);
      return `${baseCyr}${this.convertSuffixOnly(suffix, wholeWordIsFront)}`;
    }

    return this.convertWordInternal(word, forcedState);
  }

  private convertWordInternal(word: string, forcedState?: HarmonyState): string {
    const segments = this.segmentCompoundWord(word);
    if (segments.length > 1) {
      const convertedSegments = segments.map((segment) => this.convertWord(segment));
      return word.includes("-") ? convertedSegments.join("-") : convertedSegments.join("");
    }

    const isLoanwordE = this.isLoanwordWithEPrefix(word);
    const isLoanword = this.isLoanword(word);
    let currentState: HarmonyState;

    if (isLoanword) {
      currentState = word.includes(this.HAMZA) ? "soft" : "hard";
    } else if (forcedState) {
      currentState = forcedState;
    } else {
      currentState = this.getHarmonyFromArabicRoot(word);
    }

    if (word === "تىيىس") {
      currentState = "soft";
    }

    const result: string[] = [];
    let index = 0;
    let isFirstChar = true;

    while (index < word.length) {
      const char = word[index];

      if (isFirstChar && char === "ە" && isLoanwordE) {
        result.push("э");
        index += 1;
        isFirstChar = false;
        continue;
      }

      isFirstChar = false;

      if (!isLoanword) {
        if (char === "ق" || char === "ع") {
          currentState = "hard";
        } else if (char === "ك" || char === "گ" || char === this.HAMZA) {
          currentState = "soft";
        }
      } else if (char === this.HAMZA) {
        currentState = "soft";
      }

      const twoChars = word.slice(index, index + 2);
      const threeChars = word.slice(index, index + 3);
      const fourChars = word.slice(index, index + 4);

      if (twoChars === "ىي" || twoChars === "يي") {
        if (fourChars === "ىييا" || fourChars === "يييا") {
          result.push("ия");
          index += 4;
          continue;
        }
        if (threeChars === "ىيىا" || threeChars === "ييىا" || word[index + 2] === "ا") {
          result.push("ия");
          index += 3;
          continue;
        }
        result.push("и");
        index += 2;
        continue;
      }

      if (char === "ي" && index + 1 < word.length) {
        const nextChar = word[index + 1];
        if (nextChar === "ا") {
          if (isLoanword && index > 0) {
            const prevChar = word[index - 1];
            if (!(`اىوۇەۋ${this.HAMZA}`.includes(prevChar))) {
              result.push("ия");
              index += 2;
              continue;
            }
          }
          result.push("я");
          index += 2;
          continue;
        }

        if (nextChar === "ۋ") {
          result.push("ю");
          index += 2;
          continue;
        }

        if (nextChar === "و" && index > 0 && "اىوۇەۋ".includes(word[index - 1])) {
          result.push("йо");
          index += 2;
          continue;
        }
      }

      if (twoChars === "شش") {
        result.push("щ");
        index += 2;
        continue;
      }

      if (twoChars === "تس") {
        if ((isLoanword || isLoanwordE) && index + 2 < word.length) {
          result.push("ц");
          index += 2;
          continue;
        }
      }

      if (isLoanword && word.slice(index, index + 6) === "پودەزد") {
        result.push("подъезд");
        index += 6;
        continue;
      }

      if (char === this.HAMZA && index + 1 < word.length) {
        const nextChar = word[index + 1];
        if (nextChar === "ا") {
          result.push("ә");
          index += 2;
          continue;
        }
        if (nextChar === "ى") {
          result.push("і");
          index += 2;
          continue;
        }
        if (nextChar === "و") {
          result.push("ө");
          index += 2;
          continue;
        }
        if (nextChar === "ۇ") {
          result.push("ү");
          index += 2;
          continue;
        }
        index += 1;
        continue;
      }

      if (hasKey(CONSONANTS, char)) {
        result.push(CONSONANTS[char]);
        index += 1;
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(VOWEL_MAP, char)) {
        const vowel = VOWEL_MAP[char];
        result.push(typeof vowel === "string" ? vowel : currentState === "soft" ? vowel.f : vowel.b);
        index += 1;
        continue;
      }

      if (char === "ي") {
        if (index === 0) {
          if (isLoanword) {
            result.push("и");
          } else if (index + 1 < word.length && this.arabicVowels.has(word[index + 1])) {
            result.push("й");
          } else {
            result.push("и");
          }
        } else {
          const prevChar = word[index - 1];
          result.push(["ا", "ى", "و", "ۇ", "ە", "ۋ"].includes(prevChar) ? "й" : "и");
        }
        index += 1;
        continue;
      }

      if (isLoanword && char === "پ" && word.slice(index, index + 3) === "پود") {
        result.push("под");
        index += 3;
        if (index < word.length && word[index] === "ە") {
          result.push("ъе");
          index += 1;
        }
        continue;
      }

      result.push(char);
      index += 1;
    }

    return result.join("");
  }

  preprocess(text: string): string {
    let next = text.replace(/ـ/gu, "-").replace(/\u0640/gu, "-");

    next = next.replace(this.reZwnjEtc, "");
    next = next.replace(/ء/gu, this.HAMZA);
    next = next.replace(/أ/gu, `${this.HAMZA}ا`);
    next = next.replace(/ؤ/gu, `${this.HAMZA}و`);
    next = next.replace(/ئ/gu, `${this.HAMZA}ى`);
    next = next.replace(/ٵ/gu, `${this.HAMZA}ا`);
    next = next.replace(/ٶ/gu, `${this.HAMZA}و`);
    next = next.replace(/ٷ/gu, `${this.HAMZA}ۇ`);
    next = next.replace(/ٸ/gu, `${this.HAMZA}ى`);
    next = next.replace(/\u06CC/gu, "\u0649");
    next = next.replace(/،/gu, ",").replace(/؛/gu, ";").replace(/؟/gu, "?").replace(/۔/gu, ".");
    next = next.replace(this.reSpaces, " ");
    next = next.replace(this.reHyphens, "-");
    next = next.replace(this.reRedundantYye1, "ە");
    next = next.replace(this.reRedundantYye2, "ە");
    next = next.replace(this.reRedundantYye3, "ە");
    next = next.replace(this.reUndantYa, "يا");

    return next;
  }

  private postProcessContextFix(rawTokens: readonly RawToken[]): string[] {
    return rawTokens.map(([, cyr]) => cyr);
  }

  private async postProcessContextFixAsync(rawTokens: readonly RawToken[], contextSentence: string): Promise<string[]> {
    return this.disambiguator.disambiguate(rawTokens, contextSentence);
  }

  convertPhrase(phrase: string): string {
    const words = phrase.split(" ");
    if (words.length <= 1) {
      return this.convertWord(phrase);
    }

    const rawTokens = words.map((word) => [word, hasKey(EXCEPTIONS, word) ? EXCEPTIONS[word] : this.convertWord(word)] as const);
    return this.postProcessContextFix(rawTokens).join(" ");
  }

  async convertPhraseAsync(phrase: string): Promise<string> {
    const words = phrase.split(" ");
    if (words.length <= 1) {
      return this.convertWord(phrase);
    }

    const rawTokens = words.map((word) => [word, hasKey(EXCEPTIONS, word) ? EXCEPTIONS[word] : this.convertWord(word)] as const);
    const fixed = await this.postProcessContextFixAsync(rawTokens, phrase);
    return fixed.join(" ");
  }

  convert(text: string): string {
    const normalized = this.preprocess(text);
    const lines = normalized.split("\n");
    const convertedLines: string[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        convertedLines.push("");
        continue;
      }

      let result = line.replace(this.reArabicWords, (phrase) => (phrase.includes(" ") ? this.convertPhrase(phrase) : this.convertWord(phrase)));

      if (result.length > 0) {
        result = result.replace(/[a-zа-яәіңғүұқөһ]/iu, (match) => match.toUpperCase());
      }

      result = result.replace(this.reCapAfterPunct, (_match, punctuation: string, char: string) => `${punctuation} ${char.toUpperCase()}`);
      result = result.replace(this.reCapAfterQuote, (_match, quote: string, char: string) => `${quote}${char.toUpperCase()}`);
      convertedLines.push(result);
    }

    return convertedLines.join("\n");
  }

  async convertAsync(text: string): Promise<string> {
    const normalized = this.preprocess(text);
    const lines = normalized.split("\n");
    const convertedLines: string[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        convertedLines.push("");
        continue;
      }

      const matches = Array.from(line.matchAll(this.reArabicWords));
      let result = "";
      let lastIndex = 0;

      for (const match of matches) {
        const phrase = match[0];
        const matchIndex = match.index ?? 0;

        result += line.slice(lastIndex, matchIndex);
        result += phrase.includes(" ") ? await this.convertPhraseAsync(phrase) : this.convertWord(phrase);
        lastIndex = matchIndex + phrase.length;
      }

      result += line.slice(lastIndex);

      if (result.length > 0) {
        result = result.replace(/[a-zа-яәіңғүұқөһ]/iu, (char) => char.toUpperCase());
      }

      result = result.replace(this.reCapAfterPunct, (_match, punctuation: string, char: string) => `${punctuation} ${char.toUpperCase()}`);
      result = result.replace(this.reCapAfterQuote, (_match, quote: string, char: string) => `${quote}${char.toUpperCase()}`);
      convertedLines.push(result);
    }

    return convertedLines.join("\n");
  }
}

export function arb2syr(text: string, options?: ArabicToCyrillicOptions): string {
  return new ArabicToCyrillicConverter(options).convert(text);
}

export async function arb2syrAsync(text: string, options?: ArabicToCyrillicOptions): Promise<string> {
  return new ArabicToCyrillicConverter(options).convertAsync(text);
}
