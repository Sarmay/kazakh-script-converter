---
license: apache-2.0
language:
  - kk
tags:
  - onnx
  - bert
  - kazakh
  - fill-mask
  - kazakh-script-converter
pipeline_tag: fill-mask
---

# KazakhBERTmulti-onnx

This repository provides a ready-to-use ONNX model directory for `kazakh-script-converter-lm`.

It is intended to improve ambiguous Arabic Tote Zhazu -> Cyrillic conversion in Node.js by scoring candidate Kazakh sentences with a masked language model.

## Use with npm

Install:

```bash
npm install kazakh-script-converter kazakh-script-converter-lm
```

Download this model repository to a local directory such as:

```txt
models/KazakhBERTmulti-onnx
```

Then use:

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
console.log(await converter.convertAsync("اكەم كەلدى."));
```

## Expected files

This repository should contain:

- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`
- `special_tokens_map.json`
- `config.json`
- `vocab.txt`

## Source model

This ONNX export is derived from:

- `amandyk/KazakhBERTmulti`

and exported for local Node.js inference with:

- `onnxruntime-node`
- `@huggingface/tokenizers`

## Intended package

- Core package: `kazakh-script-converter`
- LM package: `kazakh-script-converter-lm`
