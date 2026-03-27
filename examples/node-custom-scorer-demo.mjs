import { ArabicToCyrillicConverter } from "../packages/core/dist/index.js";
import { CandidateLanguageModelDisambiguator } from "../packages/lm/dist/index.js";

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer: async (sentence) => {
    if (sentence.includes("әлме")) {
      return 0.05;
    }

    if (sentence.includes("алма")) {
      return 0.2;
    }

    return 1;
  }
});

const converter = new ArabicToCyrillicConverter({
  useLm: true,
  disambiguator
});

const input = "الما بار";
const output = await converter.convertAsync(input);

console.log({ input, output });
