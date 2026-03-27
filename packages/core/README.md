# @sarmay/kaz-converter

轻量、开箱即用的哈萨克语文字转换包，负责：

- 阿拉伯文 Tote Zhazu -> 西里尔文
- 西里尔文 -> 阿拉伯文 Tote Zhazu
- 浏览器 ESM
- Node.js

这个包默认不包含语言模型，不依赖 `onnxruntime-node`，适合 Web 和普通 Node.js 项目直接使用。

## 安装

```bash
npm install @sarmay/kaz-converter
```

## 浏览器使用

```ts
import { arb2syr, syr2arb } from "@sarmay/kaz-converter";

console.log(arb2syr("قازاقستان"));
console.log(syr2arb("Қазақстан"));
```

也可以直接用 CDN：

```html
<script type="module">
  import { arb2syr, syr2arb } from "https://cdn.jsdelivr.net/npm/@sarmay/kaz-converter/dist/index.js";

  console.log(arb2syr("سالەم"));
  console.log(syr2arb("Сәлем"));
</script>
```

## Node.js 使用

```ts
import {
  ArabicToCyrillicConverter,
  CyrillicToArabicConverter,
  arb2syr,
  syr2arb
} from "@sarmay/kaz-converter";

console.log(arb2syr("الما"));
console.log(syr2arb("Алматы"));

const arb2cyr = new ArabicToCyrillicConverter();
const cyr2arb = new CyrillicToArabicConverter();

console.log(arb2cyr.convert("اكەم كەلدى."));
console.log(cyr2arb.convert("Қазақстан"));
```

## API

- `arb2syr(text)`
- `arb2syrAsync(text, options)`
- `syr2arb(text)`
- `new ArabicToCyrillicConverter(options?)`
- `new CyrillicToArabicConverter(options?)`
- `new NoopDisambiguator()`

## 想接入 LM 消歧

请安装第二个包：

```bash
npm install @sarmay/kaz-converter @sarmay/kaz-converter-lm
```

然后参考 `@sarmay/kaz-converter-lm` 的 README，或者仓库根目录 README。
