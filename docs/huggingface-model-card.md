---
license: apache-2.0
base_model: amandyk/KazakhBERTmulti
library_name: onnxruntime
language:
  - kk
tags:
  - onnx
  - bert
  - kazakh
  - fill-mask
  - masked-language-model
  - nodejs
pipeline_tag: fill-mask
---

# KazakhBERTmulti-onnx

This repository provides a ready-to-use ONNX model directory for `@sarmay/kaz-converter-lm`.

It is intended to improve ambiguous Arabic Tote Zhazu -> Cyrillic conversion in Node.js by scoring candidate Kazakh sentences with a masked language model.

Model repo:

- <https://huggingface.co/sarmay/KazakhBERTmulti-onnx>

Compatible npm packages:

- `@sarmay/kaz-converter`
- `@sarmay/kaz-converter-lm`

## Use with npm

Install:

```bash
npm install @sarmay/kaz-converter @sarmay/kaz-converter-lm
```

Download this model repository to a local directory such as:

```txt
models/KazakhBERTmulti-onnx
```

If you only want the quickest path, use the bundled CLI:

```bash
npx sarmay-kaz-download ./models/KazakhBERTmulti-onnx
```

Then use:

```ts
import { createOnnxArabicToCyrillicConverter } from "@sarmay/kaz-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
console.log(await converter.convertAsync("اكەم كەلدى."));
```

## Expected local layout

```txt
models/
  KazakhBERTmulti-onnx/
    model.onnx
    tokenizer.json
    tokenizer_config.json
    special_tokens_map.json
    config.json
    vocab.txt
```

## Expected files

This repository should contain:

- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`
- `special_tokens_map.json`
- `config.json`
- `vocab.txt`

Minimum required for loading:

- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`

## Source model

This ONNX export is derived from:

- `amandyk/KazakhBERTmulti`

and exported for local Node.js inference with:

- `onnxruntime-node`
- `@huggingface/tokenizers`

## Intended use

Use this model when you want:

- a local Node.js scorer
- better disambiguation than pure rule conversion
- a drop-in model directory that works with `createOnnxArabicToCyrillicConverter()`

This repository does not package the model into npm. Download the model files separately and pass the directory path to the LM package.

## Intended package pair

- Core package: `@sarmay/kaz-converter`
- LM package: `@sarmay/kaz-converter-lm`
