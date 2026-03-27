import { describe, expect, test, vi } from "vitest";

import { ArabicToCyrillicConverter } from "@sarmay/kaz-converter";

import {
  CandidateLanguageModelDisambiguator,
  OnnxMaskedLanguageModelScorer,
  createOnnxArabicToCyrillicConverter,
  createOnnxDisambiguator
} from "../src/index";

describe("CandidateLanguageModelDisambiguator", () => {
  test("prefers the lower-scored sentence candidate", async () => {
    const disambiguator = new CandidateLanguageModelDisambiguator({
      scorer: async (sentence) => {
        if (sentence.includes("Бір күні")) {
          return 0.1;
        }

        if (sentence.includes("Бұр күні")) {
          return 0.9;
        }

        return 1;
      },
      homographs: {
        "بىر": ["Бір", "Бұр"]
      }
    });

    const resolved = await disambiguator.disambiguate([
      ["بىر", "Бұр"],
      ["كۇنى", "күні"]
    ]);

    expect(resolved.join(" ")).toBe("Бір күні");
  });
});

describe("ONNX helper factories", () => {
  test("createOnnxDisambiguator wires a scorer loaded from a model directory", async () => {
    const fakeScorer = { score: vi.fn(async () => 0.2) };
    const scorerSpy = vi.spyOn(OnnxMaskedLanguageModelScorer, "fromDirectory").mockResolvedValue(fakeScorer as never);

    const disambiguator = await createOnnxDisambiguator({
      modelDirectory: "/tmp/kazakh-model"
    });

    expect(scorerSpy).toHaveBeenCalledWith("/tmp/kazakh-model", {
      modelDirectory: "/tmp/kazakh-model"
    });
    expect(disambiguator).toBeInstanceOf(CandidateLanguageModelDisambiguator);

    scorerSpy.mockRestore();
  });

  test("createOnnxArabicToCyrillicConverter returns a ready-to-use converter", async () => {
    const fakeScorer = {
      score: vi.fn(async (sentence: string) => (sentence.includes("алма") ? 0.1 : 0.9))
    };
    const scorerSpy = vi.spyOn(OnnxMaskedLanguageModelScorer, "fromDirectory").mockResolvedValue(fakeScorer as never);

    const converter = await createOnnxArabicToCyrillicConverter({
      modelDirectory: "/tmp/kazakh-model"
    });

    expect(converter).toBeInstanceOf(ArabicToCyrillicConverter);
    expect(await converter.convertAsync("الما بار")).toBe("Алма бар");

    scorerSpy.mockRestore();
  });
});
