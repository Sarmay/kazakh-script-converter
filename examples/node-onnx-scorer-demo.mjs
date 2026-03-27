import { argv, exit } from "node:process";

import { OnnxMaskedLanguageModelScorer, createOnnxArabicToCyrillicConverter } from "../packages/lm/dist/index.js";

const modelDirectory = argv[2];

if (!modelDirectory) {
  console.error("Usage: node examples/node-onnx-scorer-demo.mjs <local-model-directory>");
  exit(1);
}

const scorer = await OnnxMaskedLanguageModelScorer.fromDirectory(modelDirectory, {
  modelFileName: "model.onnx"
});

const sentencePairs = [
  ["Алма бар.", "Әлме бар."],
  ["Бір күні", "Бұр күні"],
  ["Әкем келді.", "Акам келді."]
];

for (const [preferred, alternative] of sentencePairs) {
  const preferredScore = await scorer.score(preferred);
  const alternativeScore = await scorer.score(alternative);
  console.log({
    preferred,
    preferredScore,
    alternative,
    alternativeScore
  });
}

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory
});

for (const input of ["الما بار.", "الما جاقسى.", "بىر كۇنى", "اكەم كەلدى."]) {
  console.log({
    input,
    output: await converter.convertAsync(input)
  });
}
