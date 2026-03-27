# kazakh-script-converter-lm

`kazakh-script-converter-lm` 是 `kazakh-script-converter` 的 Node.js LM 扩展包。

它负责：

- ONNX masked language model 打分
- 歧义词候选句打分选择
- 直接创建可用的 `ArabicToCyrillicConverter`

这个包只面向 Node.js，不面向浏览器。

## 安装

```bash
npm install kazakh-script-converter kazakh-script-converter-lm
```

这个包会自动安装 `onnxruntime-node` 和 `@huggingface/tokenizers`，使用者不需要再手动装第三份依赖。

## 官方模型

推荐直接使用：

- 模型主页：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx>
- 文件列表：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx/tree/main>

在本仓库里也可以直接下载：

```bash
npm run download:model:kazbert
```

如果你是从 npm 安装这个包，而不是在仓库源码里工作，推荐直接用包自带 CLI：

```bash
npx kazakh-script-converter-lm-download
```

也可以指定目录：

```bash
npx kazakh-script-converter-lm-download ./models/KazakhBERTmulti-onnx
```

## 最简单的用法

先把 ONNX 模型目录准备好，例如：

```txt
models/KazakhBERTmulti-onnx/
  model.onnx
  tokenizer.json
  tokenizer_config.json
  special_tokens_map.json
```

然后：

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
```

## 分步用法

```ts
import { ArabicToCyrillicConverter } from "kazakh-script-converter";
import {
  CandidateLanguageModelDisambiguator,
  OnnxMaskedLanguageModelScorer
} from "kazakh-script-converter-lm";

const scorer = await OnnxMaskedLanguageModelScorer.fromDirectory("./models/KazakhBERTmulti-onnx");

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer
});

const converter = new ArabicToCyrillicConverter({
  useLm: true,
  disambiguator
});

console.log(await converter.convertAsync("اكەم كەلدى."));
```

## 模型目录要求

最少需要：

- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`

可选但推荐同时提供：

- `special_tokens_map.json`
- `config.json`
- `vocab.txt` 或 `vocab.json` / `merges.txt`

## 模型来源

你可以：

- 下载作者预导出的模型压缩包并解压到本地目录
- 自己把 Hugging Face 的 masked LM 导出成 ONNX
- 使用你自己训练的兼容模型

只要最终目录结构符合上面的要求，这个包就可以直接加载。

## 自定义候选词

```ts
import { createOnnxDisambiguator } from "kazakh-script-converter-lm";

const disambiguator = await createOnnxDisambiguator({
  modelDirectory: "./models/KazakhBERTmulti-onnx",
  homographs: {
    "الما": ["Алма", "Әлме"]
  }
});
```

## 自定义打分器

如果你不想用 ONNX，也可以自己提供一个句子打分器：

```ts
import { ArabicToCyrillicConverter } from "kazakh-script-converter";
import { CandidateLanguageModelDisambiguator } from "kazakh-script-converter-lm";

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer: async (sentence) => {
    if (sentence.includes("Алма")) return 0.1;
    if (sentence.includes("Әлме")) return 0.9;
    return 1;
  }
});

const converter = new ArabicToCyrillicConverter({
  useLm: true,
  disambiguator
});
```

更完整的模型准备和训练说明见仓库根目录 README 与 `docs/training-kazakh-lm.md`。
