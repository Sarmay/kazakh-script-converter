import { ArabicToCyrillicConverter, CandidateDisambiguator } from "../packages/core/dist/index.js";

const disambiguator = new CandidateDisambiguator({
  scorer: (sentence) => {
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
  disambiguator
});

const input = "الما بار";
const output = await converter.convertAsync(input);

console.log({ input, output });
