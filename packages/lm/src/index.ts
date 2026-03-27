import { ArabicToCyrillicConverter } from "kazakh-script-converter";
import type { ContextDisambiguator, MaybePromise, RawToken } from "kazakh-script-converter";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface SentenceScorer {
  score(sentence: string): MaybePromise<number>;
}

export type SentenceScorerLike = SentenceScorer | ((sentence: string) => MaybePromise<number>);

export interface CandidateLanguageModelDisambiguatorOptions {
  scorer: SentenceScorerLike;
  homographs?: Record<string, readonly string[]>;
  typoCandidates?: Record<string, readonly string[]>;
}

export interface OnnxMaskedLanguageModelScorerCreateOptions {
  modelPath: string;
  tokenizerPath: string;
  tokenizerConfigPath: string;
  specialTokensMapPath?: string;
}

export interface OnnxMaskedLanguageModelScorerDirectoryOptions {
  modelFileName?: string;
  tokenizerFileName?: string;
  tokenizerConfigFileName?: string;
  specialTokensMapFileName?: string;
}

export interface CreateOnnxDisambiguatorOptions extends OnnxMaskedLanguageModelScorerDirectoryOptions {
  modelDirectory: string;
  homographs?: Record<string, readonly string[]>;
  typoCandidates?: Record<string, readonly string[]>;
}

export const DEFAULT_HOMOGRAPHS: Record<string, readonly string[]> = {
  "الما": ["алма", "әлме"],
  "اكە": ["әке", "ака"],
  "بىر": ["бір", "бұр"]
};

export const DEFAULT_TYPO_CANDIDATES: Record<string, readonly string[]> = {
  "نٵۋرىز": ["Нәуріз", "Наурыз"],
  "تۇرلى": ["тұрлы", "түрлі"],
  "داستۇرلەر": ["дастұрлер", "дәстүрлер"],
  "كوكپار": ["көкпәр", "көкпар"],
  "سياقتى": ["сияқті", "сияқты"],
  "پەنويىن-ساۋىق": ["пенөйін-сауық", "пен ойын-сауық"]
};

function resolveScorer(scorer: SentenceScorerLike): SentenceScorer {
  if (typeof scorer === "function") {
    return {
      score: scorer
    };
  }

  return scorer;
}

export class CandidateLanguageModelDisambiguator implements ContextDisambiguator {
  private readonly scorer: SentenceScorer;
  private readonly homographs: Record<string, readonly string[]>;
  private readonly typoCandidates: Record<string, readonly string[]>;

  constructor(options: CandidateLanguageModelDisambiguatorOptions) {
    this.scorer = resolveScorer(options.scorer);
    this.homographs = options.homographs ?? DEFAULT_HOMOGRAPHS;
    this.typoCandidates = options.typoCandidates ?? DEFAULT_TYPO_CANDIDATES;
  }

  async disambiguate(rawTokens: readonly RawToken[]): Promise<string[]> {
    const resolved = rawTokens.map(([, converted]) => converted);
    const targetIndices: number[] = [];

    rawTokens.forEach(([arabWord], index) => {
      if (arabWord in this.homographs || arabWord in this.typoCandidates) {
        targetIndices.push(index);
      }
    });

    if (targetIndices.length === 0) {
      return resolved;
    }

    for (const targetIndex of targetIndices) {
      const arabWord = rawTokens[targetIndex][0];
      const candidates = this.homographs[arabWord] ?? this.typoCandidates[arabWord];

      if (!candidates || candidates.length === 0) {
        continue;
      }

      let bestCandidate = candidates[0];
      let lowestScore = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        const tempSentenceTokens = [...resolved];
        tempSentenceTokens[targetIndex] = candidate;
        const sentence = tempSentenceTokens.join(" ");
        const score = await this.scorer.score(sentence);

        if (score < lowestScore) {
          lowestScore = score;
          bestCandidate = candidate;
        }
      }

      resolved[targetIndex] = bestCandidate;
    }

    return resolved;
  }
}

interface HfEncoding {
  ids: number[];
  attention_mask: number[];
  token_type_ids?: number[];
}

interface HfTokenizerLike {
  encode(text: string, options?: { add_special_tokens?: boolean; return_token_type_ids?: boolean }): HfEncoding;
  token_to_id(token: string): number | undefined;
}

interface OrtTensorLike {
  dims: readonly number[];
  data: Float32Array | Float64Array;
}

interface OrtSessionLike {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, unknown>>;
}

interface OrtModuleLike {
  InferenceSession: {
    create(modelPath: string): Promise<OrtSessionLike>;
  };
  Tensor: new (type: string, data: BigInt64Array | Float32Array, dims: readonly number[]) => unknown;
}

function toInt64Tensor(ort: OrtModuleLike, values: readonly number[], dims: readonly number[]): unknown {
  return new ort.Tensor(
    "int64",
    BigInt64Array.from(values, (value) => BigInt(value)),
    dims
  );
}

function isLogitsTensor(value: unknown): value is OrtTensorLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeTensor = value as Partial<OrtTensorLike>;
  return Array.isArray(maybeTensor.dims) && (maybeTensor.data instanceof Float32Array || maybeTensor.data instanceof Float64Array);
}

function computeNegativeLogProbability(row: Float32Array | Float64Array, tokenId: number): number {
  let maxLogit = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < row.length; index += 1) {
    if (row[index] > maxLogit) {
      maxLogit = row[index];
    }
  }

  let sumExp = 0;
  for (let index = 0; index < row.length; index += 1) {
    sumExp += Math.exp(row[index] - maxLogit);
  }

  const logSumExp = maxLogit + Math.log(sumExp);
  return logSumExp - row[tokenId];
}

async function loadJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function maybeLoadJson<T>(filePath: string | undefined): Promise<T | undefined> {
  if (!filePath) {
    return undefined;
  }

  try {
    await access(filePath);
    return loadJson<T>(filePath);
  } catch {
    return undefined;
  }
}

export class OnnxMaskedLanguageModelScorer implements SentenceScorer {
  private constructor(
    private readonly ort: OrtModuleLike,
    private readonly session: OrtSessionLike,
    private readonly tokenizer: HfTokenizerLike,
    private readonly maskTokenId: number,
    private readonly specialTokenIds: ReadonlySet<number>
  ) {}

  static async create(options: OnnxMaskedLanguageModelScorerCreateOptions): Promise<OnnxMaskedLanguageModelScorer> {
    const [{ Tokenizer }, ort, tokenizerJson, tokenizerConfig, specialTokensMap] = await Promise.all([
      import("@huggingface/tokenizers"),
      import("onnxruntime-node"),
      loadJson<Record<string, unknown>>(options.tokenizerPath),
      loadJson<Record<string, unknown>>(options.tokenizerConfigPath),
      maybeLoadJson<Record<string, string>>(options.specialTokensMapPath)
    ]);

    const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig);
    const session = await ort.InferenceSession.create(options.modelPath);
    const configuredMaskToken =
      (typeof tokenizerConfig.mask_token === "string" ? tokenizerConfig.mask_token : undefined) ??
      specialTokensMap?.mask_token ??
      "[MASK]";
    const maskTokenId = tokenizer.token_to_id(configuredMaskToken);

    if (maskTokenId === undefined) {
      throw new Error(`Could not resolve mask token id for token "${configuredMaskToken}".`);
    }

    const specialTokenCandidates = [
      configuredMaskToken,
      typeof tokenizerConfig.cls_token === "string" ? tokenizerConfig.cls_token : undefined,
      typeof tokenizerConfig.sep_token === "string" ? tokenizerConfig.sep_token : undefined,
      typeof tokenizerConfig.pad_token === "string" ? tokenizerConfig.pad_token : undefined,
      typeof tokenizerConfig.bos_token === "string" ? tokenizerConfig.bos_token : undefined,
      typeof tokenizerConfig.eos_token === "string" ? tokenizerConfig.eos_token : undefined,
      specialTokensMap?.cls_token,
      specialTokensMap?.sep_token,
      specialTokensMap?.pad_token,
      specialTokensMap?.bos_token,
      specialTokensMap?.eos_token
    ].filter((token): token is string => Boolean(token));

    const specialTokenIds = new Set<number>();
    for (const token of specialTokenCandidates) {
      const tokenId = tokenizer.token_to_id(token);
      if (tokenId !== undefined) {
        specialTokenIds.add(tokenId);
      }
    }

    return new OnnxMaskedLanguageModelScorer(ort as unknown as OrtModuleLike, session, tokenizer, maskTokenId, specialTokenIds);
  }

  static async fromDirectory(
    directoryPath: string,
    options: OnnxMaskedLanguageModelScorerDirectoryOptions = {}
  ): Promise<OnnxMaskedLanguageModelScorer> {
    return OnnxMaskedLanguageModelScorer.create({
      modelPath: join(directoryPath, options.modelFileName ?? "model.onnx"),
      tokenizerPath: join(directoryPath, options.tokenizerFileName ?? "tokenizer.json"),
      tokenizerConfigPath: join(directoryPath, options.tokenizerConfigFileName ?? "tokenizer_config.json"),
      specialTokensMapPath: join(directoryPath, options.specialTokensMapFileName ?? "special_tokens_map.json")
    });
  }

  async score(sentence: string): Promise<number> {
    const encoded = this.tokenizer.encode(sentence, {
      add_special_tokens: true,
      return_token_type_ids: true
    });

    const { ids, attention_mask: attentionMask, token_type_ids: tokenTypeIds } = encoded;

    if (ids.length === 0) {
      return Number.POSITIVE_INFINITY;
    }

    let totalLoss = 0;
    let predictedTokenCount = 0;

    for (let position = 0; position < ids.length; position += 1) {
      const tokenId = ids[position];

      if (attentionMask[position] === 0 || this.specialTokenIds.has(tokenId)) {
        continue;
      }

      const maskedIds = [...ids];
      maskedIds[position] = this.maskTokenId;

      const dims = [1, ids.length] as const;
      const feeds: Record<string, unknown> = {};
      const inputNames = new Set(this.session.inputNames);

      if (inputNames.has("input_ids")) {
        feeds.input_ids = toInt64Tensor(this.ort, maskedIds, dims);
      }

      if (inputNames.has("attention_mask")) {
        feeds.attention_mask = toInt64Tensor(this.ort, attentionMask, dims);
      }

      if (inputNames.has("token_type_ids")) {
        const types = tokenTypeIds ?? Array(ids.length).fill(0);
        feeds.token_type_ids = toInt64Tensor(this.ort, types, dims);
      }

      const outputs = await this.session.run(feeds);
      const logitsTensor = outputs.logits ?? outputs[this.session.outputNames[0]];

      if (!isLogitsTensor(logitsTensor)) {
        throw new Error("Masked LM scorer expected a logits tensor shaped [batch, sequence, vocab].");
      }

      const [batchSize, sequenceLength, vocabSize] = logitsTensor.dims;
      if (batchSize !== 1 || sequenceLength !== ids.length) {
        throw new Error(`Unexpected logits shape: [${logitsTensor.dims.join(", ")}].`);
      }

      const rowOffset = position * vocabSize;
      const row = logitsTensor.data.slice(rowOffset, rowOffset + vocabSize);
      totalLoss += computeNegativeLogProbability(row, tokenId);
      predictedTokenCount += 1;
    }

    return predictedTokenCount === 0 ? Number.POSITIVE_INFINITY : totalLoss / predictedTokenCount;
  }
}

export async function createOnnxDisambiguator(
  options: CreateOnnxDisambiguatorOptions
): Promise<CandidateLanguageModelDisambiguator> {
  const scorer = await OnnxMaskedLanguageModelScorer.fromDirectory(options.modelDirectory, options);

  return new CandidateLanguageModelDisambiguator({
    scorer,
    homographs: options.homographs,
    typoCandidates: options.typoCandidates
  });
}

export async function createOnnxArabicToCyrillicConverter(
  options: CreateOnnxDisambiguatorOptions
): Promise<ArabicToCyrillicConverter> {
  const disambiguator = await createOnnxDisambiguator(options);

  return new ArabicToCyrillicConverter({
    useLm: true,
    disambiguator
  });
}
