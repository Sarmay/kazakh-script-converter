import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const corpusPath = join(root, "../data/kazakh-seed.txt");
const outputPath = join(root, "../src/ngram-data.ts");

const corpus = (await readFile(corpusPath, "utf8")).toLowerCase().replace(/\s+/gu, " ").trim();
const words = corpus.match(/[a-zа-яәіңғүұқөһёэъь]+/giu) ?? [];

const wordUnigrams = new Map();
for (const word of words) {
  wordUnigrams.set(word, (wordUnigrams.get(word) ?? 0) + 1);
}

const padded = `^^${corpus}$`;
const trigrams = new Map();
const bigrams = new Map();

for (let index = 0; index < padded.length - 2; index += 1) {
  const tri = padded.slice(index, index + 3);
  const bi = padded.slice(index, index + 2);
  trigrams.set(tri, (trigrams.get(tri) ?? 0) + 1);
  bigrams.set(bi, (bigrams.get(bi) ?? 0) + 1);
}

function serializeMap(map) {
  return Object.fromEntries([...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

const file = `export const NGRAM_ORDER = 3;

export const WORD_TOTAL = ${words.length};

export const WORD_UNIGRAMS: Record<string, number> = ${JSON.stringify(serializeMap(wordUnigrams), null, 2)};

export const BIGRAM_TOTAL = ${padded.length - 1};

export const CHAR_BIGRAMS: Record<string, number> = ${JSON.stringify(serializeMap(bigrams), null, 2)};

export const TRIGRAM_TOTAL = ${padded.length - 2};

export const CHAR_TRIGRAMS: Record<string, number> = ${JSON.stringify(serializeMap(trigrams), null, 2)};
`;

await writeFile(outputPath, file);
console.log(
  `wrote ${outputPath} words=${words.length} unigrams=${wordUnigrams.size} bigrams=${bigrams.size} trigrams=${trigrams.size}`
);
