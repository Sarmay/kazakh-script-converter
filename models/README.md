# models

这个目录用于放本地 ONNX 模型，不提交大模型文件到 git。

推荐目录示例：

```txt
models/
  KazakhBERTmulti-onnx/
    model.onnx
    tokenizer.json
    tokenizer_config.json
    special_tokens_map.json
```

本仓库的 LM 示例默认读取这里的模型目录。

当前推荐模型仓库：

- <https://huggingface.co/sarmay/KazakhBERTmulti-onnx>

你可以直接运行：

```bash
npm run download:model:kazbert
```

或者查看更完整的说明：

- [docs/model-download.md](../docs/model-download.md)
