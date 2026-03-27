# Kazakh Script Converter Monorepo

这个仓库现在整理成一个面向发布的 npm workspace，目标很明确：

- 发布一个轻量、开箱即用的通用包
- 发布一个只面向 Node.js 的 LM 扩展包
- 让使用者在“不懂训练细节”的情况下，也能直接 `npm install` 后配一个模型目录就跑起来

## 要发布的 npm 包

### 1. `kazakh-script-converter`

轻量核心包，只做规则转换：

- 阿拉伯文 Tote Zhazu -> 西里尔文
- 西里尔文 -> 阿拉伯文 Tote Zhazu
- 支持浏览器
- 支持 Node.js
- 不包含 ONNX、LM、Python 依赖

适合：

- Web 前端
- 小工具
- 不需要上下文消歧的 Node.js 服务

### 2. `kazakh-script-converter-lm`

Node.js 专用扩展包，和第一个包配合使用：

- ONNX masked LM 句子打分
- 歧义词候选消歧
- 一步创建带 LM 的 `ArabicToCyrillicConverter`

适合：

- Node.js 后端
- 需要提升 `arb2syr` 消歧效果的服务
- 需要加载你自己训练好的模型

当前阶段不建议再拆第三个 npm 包。  
除非你后面明确需要：

- 浏览器侧 ONNX 推理
- 独立模型下载 CLI
- 独立训练工具包

## 仓库结构

```txt
packages/
  core/     -> kazakh-script-converter
  lm/       -> kazakh-script-converter-lm
examples/   -> 浏览器、Node.js、Node.js + ONNX 示例
scripts/    -> 模型导出脚本
docs/       -> 训练和维护文档
models/     -> 本地模型目录占位，不提交大模型
```

## 给最终使用者的最简单使用方式

### Web 端

只安装核心包：

```bash
npm install kazakh-script-converter
```

然后：

```ts
import { arb2syr, syr2arb } from "kazakh-script-converter";

console.log(arb2syr("قازاقستان"));
console.log(syr2arb("Қазақстан"));
```

浏览器 CDN：

```html
<script type="module">
  import { arb2syr, syr2arb } from "https://cdn.jsdelivr.net/npm/kazakh-script-converter/dist/index.js";

  console.log(arb2syr("سالەم"));
  console.log(syr2arb("Сәлем"));
</script>
```

### Node.js 不带 LM

同样只装核心包：

```bash
npm install kazakh-script-converter
```

```ts
import {
  ArabicToCyrillicConverter,
  CyrillicToArabicConverter,
  arb2syr,
  syr2arb
} from "kazakh-script-converter";

console.log(arb2syr("اكەم"));
console.log(syr2arb("Қазақстан"));

const arb2cyr = new ArabicToCyrillicConverter();
const cyr2arb = new CyrillicToArabicConverter();

console.log(arb2cyr.convert("الما بار."));
console.log(cyr2arb.convert("Әл-Фараби атындағы ұлттық университет."));
```

### Node.js 配合 LM

只需要两步：

1. 安装两个包
2. 把模型解压到一个目录，然后把路径传进去

安装：

```bash
npm install kazakh-script-converter kazakh-script-converter-lm
```

最简单的代码：

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
console.log(await converter.convertAsync("اكەم كەلدى."));
```

这就是最终想要给使用者的体验。  
使用者不需要看训练代码，不需要看 ONNX 细节，只需要一个模型目录。

## 模型目录怎么放

推荐约定：

```txt
models/
  KazakhBERTmulti-onnx/
    model.onnx
    tokenizer.json
    tokenizer_config.json
    special_tokens_map.json
```

最少需要：

- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`

推荐额外保留：

- `special_tokens_map.json`
- `config.json`
- `vocab.txt` 或 `vocab.json`
- `merges.txt`（如果 tokenizer 需要）

## 你的本地 ONNX 模型怎么分发

不要把模型打进 npm 包。

推荐做法：

1. 把模型目录压缩成一个 zip
2. 上传到 GitHub Releases、Hugging Face、对象存储或其他可免费下载地址
3. 在文档里告诉用户下载后解压到 `models/` 下

推荐用户侧流程：

```bash
npm install kazakh-script-converter kazakh-script-converter-lm
npm run download:model:kazbert
node app.mjs
```

现在已经有一个可公开访问的 Hugging Face 模型仓库：

- 模型主页：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx>
- 文件列表：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx/tree/main>

本仓库提供了直接下载脚本：

```bash
npm run download:model:kazbert
```

如果用户是从 npm 安装包，不在这个仓库里工作，也可以直接：

```bash
npx kazakh-script-converter-lm-download
```

它会把模型文件下载到：

```txt
models/KazakhBERTmulti-onnx
```

更完整的模型下载文档见：  
[docs/model-download.md](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/docs/model-download.md)

## 使用者也可以换成自己的模型

`kazakh-script-converter-lm` 不绑定某一个模型仓库。  
只要用户最终能提供一个兼容目录，它就能直接加载。

例如：

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "/absolute/path/to/my-own-model"
});
```

如果用户想更细地控制，也可以自己分步创建：

```ts
import { ArabicToCyrillicConverter } from "kazakh-script-converter";
import {
  CandidateLanguageModelDisambiguator,
  OnnxMaskedLanguageModelScorer
} from "kazakh-script-converter-lm";

const scorer = await OnnxMaskedLanguageModelScorer.fromDirectory("/absolute/path/to/model");

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer
});

const converter = new ArabicToCyrillicConverter({
  useLm: true,
  disambiguator
});
```

## Web 端详细说明

`kazakh-script-converter` 设计上就是浏览器友好的：

- 无 Python
- 无 ONNX Runtime
- 无 Node 原生依赖

### 在 Vite / Webpack / Rollup 中使用

```ts
import { arb2syr, syr2arb } from "kazakh-script-converter";

const arabic = syr2arb("Қазақстан");
const cyrillic = arb2syr("قازاقستان");
```

### 在静态 HTML 中用本仓库示例

先构建：

```bash
npm run build
```

再启动静态服务器：

```bash
python3 -m http.server 4173
```

打开：

```txt
http://127.0.0.1:4173/examples/browser-demo.html
```

示例页文件：  
[examples/browser-demo.html](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/examples/browser-demo.html)

## Node.js 详细说明

### 只做规则转换

直接使用 `kazakh-script-converter`。

### 需要更高的阿拉伯文 -> 西里尔文精度

安装两个包，并使用 `kazakh-script-converter-lm`。

最推荐的入口就是：

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";
```

因为这样最符合“只传模型路径就能跑”的使用预期。

## Node.js + LM 详细说明

### 默认推荐模型

当前建议默认给用户提供一个已经导出的哈萨克语 ONNX 模型目录，例如：

- `KazakhBERTmulti-onnx`

它的优点是：

- 接入简单
- 已经验证能被当前 scorer 直接加载
- 对本项目关键歧义词比通用多语模型更合适

### 一步接入

```ts
import { createOnnxArabicToCyrillicConverter } from "kazakh-script-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
console.log(await converter.convertAsync("اكەم كەلدى."));
```

### 自定义候选映射

```ts
import { createOnnxDisambiguator } from "kazakh-script-converter-lm";
import { ArabicToCyrillicConverter } from "kazakh-script-converter";

const disambiguator = await createOnnxDisambiguator({
  modelDirectory: "./models/KazakhBERTmulti-onnx",
  homographs: {
    "الما": ["Алма", "Әлме"]
  }
});

const converter = new ArabicToCyrillicConverter({
  useLm: true,
  disambiguator
});
```

### 不用 ONNX，也可以接你自己的 scorer

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

这样你后面也可以接：

- 自己的 HTTP scorer
- 本地别的推理引擎
- 其他语言模型服务

## 仓库内可直接运行的示例

### 1. 浏览器示例

[examples/browser-demo.html](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/examples/browser-demo.html)

### 1.5 模型下载页

[examples/model-download.html](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/examples/model-download.html)

### 2. Node.js 自定义 scorer 示例

[examples/node-custom-scorer-demo.mjs](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/examples/node-custom-scorer-demo.mjs)

### 3. Node.js ONNX 示例

[examples/node-onnx-scorer-demo.mjs](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/examples/node-onnx-scorer-demo.mjs)

## 维护者：如何导出自己的模型

仓库内置导出脚本：

```bash
npm run export:model:kazbert
```

或者导出你指定的 Hugging Face 模型：

```bash
node scripts/export-hf-mlm-to-onnx.mjs <model-id> <output-dir>
```

例如：

```bash
node scripts/export-hf-mlm-to-onnx.mjs nur-dev/roberta-kaz-large models/roberta-kaz-large-onnx
```

如果网络需要代理：

```bash
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890
```

导出脚本会自动：

- 创建 Python venv
- 安装 `torch`、`transformers`、`optimum`、`onnxruntime`
- 导出 `model.onnx`
- 生成 `tokenizer.json`

## 如何提升精度

重点不是让模型做全文转换，而是提升“候选句排序能力”。

建议路线：

1. 准备更大的西里尔文哈萨克语语料
2. 构造专门的歧义词评测集
3. 从哈萨克语 MLM 继续预训练
4. 导出 ONNX
5. 用 `arb2syrAsync()` 做端到端回归

详细训练说明见：  
[docs/training-kazakh-lm.md](/Users/sarmay/Desktop/TestProjects/kazakh-script-converter/docs/training-kazakh-lm.md)

## 发布顺序建议

因为第二个包依赖第一个包，所以发布顺序建议固定：

1. 先发 `kazakh-script-converter`
2. 再发 `kazakh-script-converter-lm`

## 本地开发

安装依赖：

```bash
npm install
```

构建两个包：

```bash
npm run build
```

跑测试：

```bash
npm test
```

检查两个包的打包内容：

```bash
npm run pack:dry
```
