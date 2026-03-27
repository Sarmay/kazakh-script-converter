import { describe, expect, test } from "vitest";

import { ArabicToCyrillicConverter, CyrillicToArabicConverter, arb2syr, arb2syrAsync, syr2arb } from "../src/index";
import {
  arabicToCyrillicCases,
  cyrillicToArabicSentenceCases,
  cyrillicToArabicStressCases
} from "./regression-cases";

describe("ArabicToCyrillicConverter", () => {
  test("matches the Python sample corpus", () => {
    for (const [input, expected, label] of arabicToCyrillicCases) {
      expect(arb2syr(input), label).toBe(expected);
    }
  });

  test("converts a mixed sentence with punctuation", () => {
    expect(arb2syr("قازاقستان، الماتى، استانا.")).toBe("Қазақстан, Алматы, Астана.");
  });

  test("requires a custom disambiguator when LM mode is requested", () => {
    expect(() => new ArabicToCyrillicConverter({ useLm: true })).toThrow(/Provide options\.disambiguator/i);
  });

  test("supports async Node-side disambiguation for ambiguous phrases", async () => {
    const disambiguator = {
      async disambiguate(rawTokens: readonly (readonly [string, string])[]) {
        return rawTokens.map(([source, converted]) => {
          if (source === "الما") {
            return "Әлме";
          }

          return converted;
        });
      }
    };

    const output = await arb2syrAsync("الما بار", {
      useLm: true,
      disambiguator
    });

    expect(output).toContain("Әлме");
  });
});

describe("CyrillicToArabicConverter", () => {
  test("matches the 18-sentence Python business regression suite", () => {
    for (const [input, expected, label] of cyrillicToArabicSentenceCases) {
      expect(syr2arb(input), label).toBe(expected);
    }
  });

  test("matches the Python stress suite for difficult single words", () => {
    for (const [input, expected, label] of cyrillicToArabicStressCases) {
      expect(syr2arb(input), label).toBe(expected);
    }
  });

  test("supports custom lexicon injection", () => {
    const converter = new CyrillicToArabicConverter({
      lexicon: {
        nativeRoots: ["сынақ"]
      }
    });

    expect(converter.convert("Сынақ")).toBe("سىناق");
  });

  test("keeps punctuation and numeric context aligned with the Python baseline", () => {
    const input = "2026-жылы Қазақстанның ЖІӨ-сі 5%-ға өседі деп күтілуде!";
    const expected = "2026-جىلى قازاقستاننىڭ جىيىو-سى 5%-عا وسەدى دەپ كۇتىلۋدە!";
    expect(syr2arb(input)).toBe(expected);
  });
});
