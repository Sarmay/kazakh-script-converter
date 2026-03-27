# 模型下载与发布

这份文档面向最终使用者和模型维护者。

## 官方模型

当前推荐直接使用你已经发布到 Hugging Face 的模型仓库：

- 模型主页：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx>
- 文件列表：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx/tree/main>

推荐本地目录：

```txt
models/KazakhBERTmulti-onnx
```

## 最简单的下载方式

### 方式 1：直接运行仓库脚本

```bash
node scripts/download-hf-model.mjs
```

或者显式指定：

```bash
node scripts/download-hf-model.mjs sarmay/KazakhBERTmulti-onnx models/KazakhBERTmulti-onnx
```

### 方式 1.5：npm 包自带 CLI

如果你是从 npm 安装 `kazakh-script-converter-lm`，不是在这个仓库源码里工作，推荐直接：

```bash
npx kazakh-script-converter-lm-download
```

或者指定目录：

```bash
npx kazakh-script-converter-lm-download ./models/KazakhBERTmulti-onnx
```

如果网络需要代理：

```bash
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890
```

### 方式 2：手动下载

直接文件链接：

- `model.onnx`:
  <https://huggingface.co/sarmay/KazakhBERTmulti-onnx/resolve/main/model.onnx>
- `tokenizer.json`:
  <https://huggingface.co/sarmay/KazakhBERTmulti-onnx/resolve/main/tokenizer.json>
- `tokenizer_config.json`:
  <https://huggingface.co/sarmay/KazakhBERTmulti-onnx/resolve/main/tokenizer_config.json>
- `special_tokens_map.json`:
  <https://huggingface.co/sarmay/KazakhBERTmulti-onnx/resolve/main/special_tokens_map.json>
- `config.json`:
  <https://huggingface.co/sarmay/KazakhBERTmulti-onnx/resolve/main/config.json>
- `vocab.txt`:
  <https://huggingface.co/sarmay/KazakhBERTmulti-onnx/resolve/main/vocab.txt>

下载后目录应至少满足：

```txt
models/
  KazakhBERTmulti-onnx/
    model.onnx
    tokenizer.json
    tokenizer_config.json
```

## Node.js 中如何使用

```bash
npm install kazakh-script-converter kazakh-script-converter-lm
node scripts/download-hf-model.mjs
```

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
```

## Hugging Face 模型仓库发布模板

建议模型仓库至少包含：

- `README.md`
- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`
- `special_tokens_map.json`
- `config.json`
- `vocab.txt`

推荐模型仓库 README 至少写清楚：

1. 这个模型是给哪个 npm 包用的
2. 用户下载后本地目录应该长什么样
3. 最简单的 Node.js 示例
4. 推荐配套包名
5. 模型来源和导出方式

本仓库已经准备了一份可直接用的模型卡模板：

- [docs/huggingface-model-card.md](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/docs/huggingface-model-card.md)
