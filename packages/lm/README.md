# @sarmay/kaz-converter-lm

`@sarmay/kaz-converter-lm` 是可选的 Node.js ONNX 扩展。

核心包 `@sarmay/kaz-converter` 已经默认带轻量 n-gram 消歧，浏览器和普通 Node.js 都不需要这个包。

只有在你明确要用更大的 masked language model 做候选打分时，才安装本包。它负责：

- ONNX masked language model 打分
- 把该 scorer 接到现有的候选消歧接口上
- 直接创建可用的 `ArabicToCyrillicConverter`

这个包只面向 Node.js，不面向浏览器。

## 安装

```bash
npm install @sarmay/kaz-converter @sarmay/kaz-converter-lm
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
npx sarmay-kaz-download
```

也可以指定目录：

```bash
npx sarmay-kaz-download ./models/KazakhBERTmulti-onnx
```

这个 CLI 支持：

- 已完成文件自动跳过
- 中断后的大文件自动续传
- 网络错误自动重试

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
import { createOnnxArabicToCyrillicConverter } from "@sarmay/kaz-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
```

## 分步用法

```ts
import { ArabicToCyrillicConverter } from "@sarmay/kaz-converter";
import {
  CandidateLanguageModelDisambiguator,
  OnnxMaskedLanguageModelScorer
} from "@sarmay/kaz-converter-lm";

const scorer = await OnnxMaskedLanguageModelScorer.fromDirectory("./models/KazakhBERTmulti-onnx");

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer
});

const converter = new ArabicToCyrillicConverter({
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
import { createOnnxDisambiguator } from "@sarmay/kaz-converter-lm";

const disambiguator = await createOnnxDisambiguator({
  modelDirectory: "./models/KazakhBERTmulti-onnx",
  homographs: {
    "الما": ["Алма", "Әлме"]
  }
});
```

## 自定义打分器

如果你只是想换一个打分函数，不必安装本包。请用核心包的 `CandidateDisambiguator`。

本包只在你已经有 ONNX 模型目录，并希望用 masked LM 打分时使用。

更完整的模型准备和训练说明见仓库根目录 README 与 `docs/training-kazakh-lm.md`。

## License

MIT. See [LICENSE](LICENSE).
