import { ArabicToCyrillicConverter, NoopDisambiguator, arb2syr } from "../packages/core/dist/index.js";

const samples = ["الما بار", "اكەم كەلدى", "بىر كۇنى", "قولىڭنان الما"];

console.log("default light disambiguation:");
for (const input of samples) {
  console.log({ input, output: arb2syr(input) });
}

const raw = new ArabicToCyrillicConverter({
  disambiguator: new NoopDisambiguator()
});

console.log("\nnoop / rules only:");
for (const input of samples) {
  console.log({ input, output: raw.convert(input) });
}
