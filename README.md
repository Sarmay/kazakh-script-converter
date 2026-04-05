# Kazakh Script Converter Monorepo

这个仓库是一个面向发布的 npm workspace，目标不是做“学术演示版转换器”，而是提供一套能在真实项目里直接使用的哈萨克语文字转换方案：

- `@sarmay/kaz-converter`
  轻量核心包，负责规则转换，不依赖 ONNX、不依赖 Python、可用于浏览器和 Node.js。
- `@sarmay/kaz-converter-lm`
  Node.js 专用 LM 扩展包，负责候选句打分与歧义消解，可加载你自己的 ONNX masked language model。

这个项目的核心设计原则很简单：

1. 绝大多数稳定、可确定的转换，用规则解决。
2. 少量需要上下文判断的歧义，不让规则“硬猜”，而是交给 LM 做候选句排序。
3. 不把大模型塞进 npm 包，而是把“规则包”和“模型包”彻底分开。

这意味着它不是一个“让语言模型直接翻译整句话”的系统，而是一个“规则优先、LM 辅助”的工程化转换器。

## 包结构与职责

### `@sarmay/kaz-converter`

负责：

- 阿拉伯文 Tote Zhazu -> 西里尔文
- 西里尔文 -> 阿拉伯文 Tote Zhazu
- 规则转换
- 浏览器和 Node.js 兼容

不负责：

- 模型加载
- ONNX 推理
- 句子概率打分
- Python 训练流程

适合：

- Web 前端
- 浏览器工具
- 不需要上下文消歧的 Node.js 服务
- 对包体积敏感的场景

### `@sarmay/kaz-converter-lm`

负责：

- ONNX masked language model 句子打分
- 同形词、多候选词、脏数据候选的选择
- 直接创建带 LM 的 `ArabicToCyrillicConverter`

不负责：

- 浏览器内 ONNX 推理
- 模型训练本身
- 全文生成式翻译

适合：

- Node.js 后端
- 需要提升 `arb2syr` 歧义词表现的服务
- 需要加载自定义哈萨克语 MLM 的场景

## 为什么拆成两个包

这么拆不是为了“架构好看”，而是为了实际使用体验：

- 核心转换本身应该足够轻，前端用户不应该被迫安装 `onnxruntime-node`
- LM 相关依赖只适用于 Node.js，不应该污染浏览器侧依赖图
- 模型文件很大，不适合打进 npm 包
- 很多用户只需要稳定规则转换，并不需要 LM
- 一部分用户需要换成自己的模型，所以 LM 层必须独立

简单说：

- 规则是基础能力
- LM 是增强能力
- 模型是外部资产

这三者在工程上应该分离。

## 快速开始

### Web 端

只安装核心包：

```bash
npm install @sarmay/kaz-converter
```

```ts
import { arb2syr, syr2arb } from "@sarmay/kaz-converter";

console.log(arb2syr("قازاقستان"));
console.log(syr2arb("Қазақстан"));
```

CDN：

```html
<script type="module">
  import { arb2syr, syr2arb } from "https://cdn.jsdelivr.net/npm/@sarmay/kaz-converter/dist/index.js";

  console.log(arb2syr("سالەم"));
  console.log(syr2arb("Сәлем"));
</script>
```

### Node.js，不带 LM

```bash
npm install @sarmay/kaz-converter
```

```ts
import {
  ArabicToCyrillicConverter,
  CyrillicToArabicConverter,
  arb2syr,
  syr2arb
} from "@sarmay/kaz-converter";

console.log(arb2syr("اكەم"));
console.log(syr2arb("Қазақстан"));

const arb2cyr = new ArabicToCyrillicConverter();
const cyr2arb = new CyrillicToArabicConverter();

console.log(arb2cyr.convert("الما بار."));
console.log(cyr2arb.convert("Әл-Фараби атындағы ұлттық университет."));
```

### Node.js，带 LM

```bash
npm install @sarmay/kaz-converter @sarmay/kaz-converter-lm
```

```ts
import { createOnnxArabicToCyrillicConverter } from "@sarmay/kaz-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/KazakhBERTmulti-onnx"
});

console.log(await converter.convertAsync("الما بار."));
console.log(await converter.convertAsync("بىر كۇنى"));
console.log(await converter.convertAsync("اكەم كەلدى."));
```

这里的使用者体验应该始终尽量保持为：

1. 安装包
2. 准备模型目录
3. 传一个路径
4. 开始调用

## 目录结构

```txt
packages/
  core/     -> @sarmay/kaz-converter
  lm/       -> @sarmay/kaz-converter-lm
examples/   -> 浏览器、Node.js、Node.js + ONNX 示例
scripts/    -> 模型导出和下载脚本
docs/       -> 训练、发布、模型下载文档
models/     -> 本地模型目录占位
```

## 整体工作流

阿拉伯文 -> 西里尔文的流程大致是：

1. 先做输入标准化
2. 识别例外词、专名、音译词
3. 识别复合词和可能的词根/后缀边界
4. 根据元音和辅音信号判断前后排和谐
5. 执行逐字规则转换
6. 如果是异步 LM 路径，再对少量候选做句子级打分
7. 做大小写与标点后处理

西里尔文 -> 阿拉伯文的流程不同，它更依赖词根词典和复合词拆分，再决定是否加 hamza、如何处理借词、如何映射元音。

## 为什么要用 LM

因为规则并不能可靠解决所有歧义。

例如阿拉伯文输入中，某些写法本身就可能对应多个西里尔形式：

- `الما` 可能是 `алма`，也可能是 `әлме`
- `اكە` 可能是 `әке`，也可能是 `ака`
- `بىر` 在某些脏数据或特殊场景里可能需要和别的候选比较

如果完全靠规则硬编码，会出现几个问题：

- 规则数量会膨胀
- 规则之间会互相冲突
- 句子上下文无法自然表达
- 维护成本会越来越高

LM 在这个项目里的职责不是“替代规则”，而是“在规则已经给出若干合理候选时，判断哪个句子更自然”。

这是一个非常重要的边界。

### LM 的作用

LM 主要做三件事：

- 同形词候选选择
- 错拼/脏数据候选选择
- 上下文自然度排序

LM 不做的事：

- 不直接把阿拉伯文整句翻译成西里尔文
- 不替代基础字母映射
- 不替代所有例外词表
- 不保证脱离规则独立工作

### 为什么选 masked LM，而不是生成式 LM

当前实现更适合 masked LM，原因是：

- 项目需要的是句子自然度打分，不是自由生成
- masked LM 更适合做 pseudo-log-likelihood 评分
- 工程接入简单，容易导出为 ONNX
- 对“候选句谁更自然”这个任务足够直接
- 可以把 LM 控制在很小的职责范围内，风险更低

所以这里的思路不是“让大模型接管转换”，而是“让小而稳定的规则系统，在少量关键歧义点借助语言模型补一刀”。

## 为什么不是把所有哈萨克词语都列出来

因为这在工程上并不现实。

原因包括：

- 哈萨克语词汇量很大
- 人名、地名、机构名、音译词不断增长
- 黏着语形态变化很多，同一个词根会派生出大量词形
- 真实输入里会有错别字、省写、混写、脏数据
- 某些边界判断不是“词典收录了没有”这么简单，而是“当前句子里更像哪一种结构”

因此，这个项目采用的是“规则 + 小型高价值词表/模式表 + 可选 LM”的路线，而不是“试图穷举所有词”。

仓库里的那些词表和规则集合，不是为了覆盖全部词汇，而是为了覆盖：

- 高频问题
- 高歧义问题
- 回归测试里真实出现过的问题
- 对整体质量影响很大的结构性问题

这也是为什么下面这些规则集合虽然不可能囊括全部词语，但仍然必须存在。

## 规则系统详解

下面重点解释阿拉伯文 -> 西里尔文规则里几个关键集合。

### `VALID_SUFFIXES`

作用：

- 用于识别词根和后缀边界
- 判断某个阿拉伯文词尾是否可能由多个合法后缀构成
- 帮助把 `prefix + suffix` 结构拆开，再分别转换

为什么需要它：

- 哈萨克语是典型黏着语
- 同一个词根后面会接复数、格、领属、派生、动词形态等多个后缀
- 如果不识别后缀，很多词会被当成一个整体硬转，导致元音和谐、借词判断、拼写结果都偏掉

为什么它不可能包含所有形式：

- 后缀组合非常多
- 口语、省写、非规范写法也很多
- 真实输入中还会出现连写、漏写、错写

为什么仍然值得加：

- 即便不能穷尽，覆盖高频合法后缀后，根词识别能力会明显提升
- 对复数、格、领属、动词常见尾缀的识别收益很高
- 它是“让转换器知道哪里可能是词根边界”的关键启发式之一

当前实现方式：

- 它是 `packages/core/src/arb2syr.ts` 里的一个 `Set`
- `isValidSuffixSequence()` 使用动态规划判断一个词尾能否被拆成若干合法后缀

### `COMPOUND_PIVOT_ROOTS`

作用：

- 用于识别复合词中可能的分界点
- 当一个词内部包含某些高频构词核心时，允许在该位置切分成两个部分分别处理

为什么需要它：

- 很多哈萨克语复合词不是简单字母线性映射
- 如果完全不拆分，前半部分和后半部分的和谐、借词、专名判断可能互相污染
- 某些构词中心如 `سوز`、`تىل`、`بىلىم`、`حانا` 这类，常出现在复合结构中

为什么它不可能穷尽：

- 复合词构成非常开放
- 生产新词和术语的能力很强
- 很多词既可能是独立词，也可能是复合词后半段

为什么仍然要加：

- 对高频构词中心做启发式拆分，能覆盖大量真实场景
- 这类规则的收益通常远大于维护成本

### `NAME_PREFIX_COMPONENTS`

作用：

- 用于识别常见人名复合前缀
- 在姓名连写时优先尝试把前缀和后半部分拆开

例如这类结构：

- `ءابدى...`
- `داۋلەت...`
- `گۇل...`
- `بەك...`
- `نۇر...`

为什么需要它：

- 人名往往不是普通词汇规则能稳定覆盖的
- 阿拉伯文输入里姓名经常连写
- 如果不拆，转换器可能会把整串当成普通词去推断

为什么不可能包含所有姓名前缀：

- 哈萨克人名、伊斯兰传统姓名、现代音译名都很丰富
- 变体拼写很多
- 不同地区和书写习惯差异明显

为什么仍然要加：

- 这类前缀频率高
- 对姓名转换体验影响非常大
- 少量规则就能显著提升常见人名结果

### `NAME_SUFFIX_COMPONENTS`

作用：

- 用于识别常见姓名后半部分
- 避免在错误位置切断姓名
- 帮助把连写姓名合理拆成前后两个构件

为什么需要它：

- 姓名内部的结构和普通词不完全一样
- 有些后缀既像普通词尾，又像固定人名成分
- 如果在姓名后半部分中间错误切分，会产生非常奇怪的结果

代码里它还用于：

- `crossesProtectedNameEnding()` 防止根词/后缀拆分时切穿姓名尾部
- `segmentCompoundWord()` 优先按人名后缀拆分

为什么不可能穷尽：

- 人名后缀来源复杂
- 既有传统名，也有现代借名、音译名
- 还会不断增加

为什么仍然要加：

- 姓名是用户非常敏感的内容
- 少量高频姓名构件能覆盖大量真实输入
- 对“看起来像哈萨克姓名”的自然度提升非常明显

### `IMPLICIT_SOFT_ROOTS`

作用：

- 这是一个“隐式前排词根”集合
- 当某些词根本身没有足够明显的字符信号时，帮助系统优先判断它们更接近前排和谐

为什么需要它：

- 仅靠 `ك/گ`、`ق/ع`、`ە`、hamza 等显式信号，并不能稳定覆盖所有词
- 有些词虽然写法中显式信号不强，但从语言事实上更应按前排处理
- 如果不补这一层，会出现系统性偏硬、偏后排的问题

为什么不可能穷尽：

- 前后排和谐不是简单的“把所有软词列出来”就能解决
- 同词根派生形、借词、拼写变体都很多

为什么仍然要加：

- 它修正的是一类结构性误差
- 少量高价值根词就能减少很多错误
- 这是典型的“不能穷尽，但对系统质量有明显帮助”的启发式规则

## 这些规则集合为什么是“必要但不完美”的

这是整个 README 最重要的一点。

这些集合不是词典，不是语言学全量规范，也不是最终答案。它们的定位是：

- 工程启发式
- 高频回归修复集合
- 结构性错误修补器

它们存在的原因不是“作者相信所有相关词都能被列完”，而是：

- 在纯规则系统里，少量高价值规则能带来很大的精度提升
- 某些错误如果不修，用户会非常频繁地碰到
- 相比完全依赖大模型，这类规则更稳定、可解释、可回归测试

因此可以把这些集合理解为：

- 一个高收益的修正层
- 一个真实案例驱动的增量集合
- 一个随着回归样本逐渐增长的工程资产

而不是“哈萨克语完整词库”。

## 哪些支持自定义

这里要分清楚两类自定义。

### 1. 运行时公开支持的自定义

这类可以直接通过 npm 包 API 完成。

#### `ArabicToCyrillicOptions`

```ts
interface ArabicToCyrillicOptions {
  useLm?: boolean;
  disambiguator?: ContextDisambiguator;
  nameYSequenceStyle?: "normalize" | "preserve";
}
```

字段说明：

- `useLm`
  语义上表示“当前转换器准备启用基于上下文的消歧能力”。
- `disambiguator`
  由调用方提供的候选消歧器，真正负责异步上下文判断。
- `nameYSequenceStyle`
  控制某些姓名中 `ييا / ييار / يياز / يياس` 这类序列的输出风格。

#### `useLm` 的真实含义

这里有一个很容易误解的点。

`useLm` 不是说：

- 核心包里内置了 LM
- 只要设成 `true` 就会自动有模型能力

它真正表示的是：

- 你显式声明“这次实例化准备启用基于上下文的消歧”
- 如果这样声明，就必须由调用方同时提供 `disambiguator`

当前核心包本身不内置 LM，所以如果你写：

```ts
new ArabicToCyrillicConverter({ useLm: true })
```

会直接抛错，因为没有提供 `disambiguator`。

还需要注意一个实现细节：

- 当前版本里，真正决定异步消歧是否发生的是 `disambiguator` 是否存在
- `useLm` 更像一个显式意图和安全检查
- 如果你传了 `disambiguator`，即使没有写 `useLm: true`，异步 `convertAsync()` 仍然会走你提供的消歧器

#### `disambiguator` 的接口

```ts
interface ContextDisambiguator {
  disambiguate(
    rawTokens: readonly [source: string, converted: string][],
    contextSentence: string
  ): string[] | Promise<string[]>;
}
```

含义：

- `rawTokens`
  每个词的原始阿拉伯文和规则初步转换结果
- `contextSentence`
  当前整句原文，可用于自定义上下文逻辑
- 返回值
  与 token 数量对应的一组最终西里尔结果

这意味着你可以自定义：

- 本地 ONNX scorer
- HTTP 远程打分服务
- 数据库规则
- 你自己的语言模型

#### `nameYSequenceStyle`

可选值：

- `"normalize"` 默认值
- `"preserve"`

作用：

- `"normalize"` 会把部分人名中的 `ييا` 一类写法收敛到更自然的规范输出
- `"preserve"` 会尽量保留更接近原串的双 `й` 风格

当前测试覆盖的例子：

- `عالييا -> Ғалия`，`preserve` 时为 `Ғалийа`
- `دييار -> Дияр`，`preserve` 时为 `Дийар`
- `نيياز -> Нияз`，`preserve` 时为 `Нийаз`

#### `CyrillicToArabicOptions`

```ts
interface CyrillicToArabicOptions {
  lexicon?: {
    nativeRoots?: string[];
    loanRoots?: string[];
  };
}
```

作用：

- 向西里尔 -> 阿拉伯转换器补充自定义词根词典
- 影响复合词拆分和借词判断
- 当前实现会把你传入的 `nativeRoots` / `loanRoots` 追加到内置默认词典后面，再统一加载

使用示例：

```ts
import { CyrillicToArabicConverter } from "@sarmay/kaz-converter";

const converter = new CyrillicToArabicConverter({
  lexicon: {
    nativeRoots: ["сынақ"],
    loanRoots: ["платформа"]
  }
});
```

这类自定义是运行时公开支持的。

### 2. LM 包公开支持的自定义

#### `CandidateLanguageModelDisambiguatorOptions`

```ts
interface CandidateLanguageModelDisambiguatorOptions {
  scorer: SentenceScorer | ((sentence: string) => number | Promise<number>);
  homographs?: Record<string, readonly string[]>;
  typoCandidates?: Record<string, readonly string[]>;
}
```

字段说明：

- `scorer`
  句子打分器。分数越低，代表句子越自然。
- `homographs`
  同形词候选表，例如某个阿拉伯文词对应多个西里尔候选。
- `typoCandidates`
  脏数据、错拼、变体输入的候选表。

需要特别注意：

- 当前实现中，如果你传入 `homographs`，它会替换默认 `DEFAULT_HOMOGRAPHS`
- 如果你传入 `typoCandidates`，它会替换默认 `DEFAULT_TYPO_CANDIDATES`
- 它们不是“自动在默认表上增量合并”

如果你想“保留默认值再追加自己的词”，推荐显式合并：

```ts
import {
  DEFAULT_HOMOGRAPHS,
  DEFAULT_TYPO_CANDIDATES,
  CandidateLanguageModelDisambiguator
} from "@sarmay/kaz-converter-lm";

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer,
  homographs: {
    ...DEFAULT_HOMOGRAPHS,
    "الما": ["Алма", "Әлме"],
    "اكە": ["Әке", "Ака"]
  },
  typoCandidates: {
    ...DEFAULT_TYPO_CANDIDATES,
    "داستۇرلەر": ["дастұрлер", "дәстүрлер"]
  }
});
```

#### `homographs` 的作用

这是“这个词可能有多个合理西里尔形式”的映射表，例如：

```ts
{
  "الما": ["алма", "әлме"]
}
```

流程是：

1. 规则先跑出基础结果
2. 消歧器发现这个词在 `homographs` 里
3. 把候选分别放进整句里
4. 让 scorer 比较整句自然度
5. 选分数最低的那个

#### `typoCandidates` 的作用

这是为真实世界脏数据准备的。

很多用户输入不是规范阿拉伯文，而是：

- 漏字
- 误字
- 混合写法
- 视觉上相近但语言学上不规范的拼法

这类情况很难靠一条固定规则绝对修好，所以更适合做候选比较。

#### 自定义 scorer

你不一定非要用 ONNX。

只要实现：

```ts
interface SentenceScorer {
  score(sentence: string): number | Promise<number>;
}
```

就可以接：

- 自己的模型服务
- 另一个推理引擎
- 任何能给句子打分的系统

示例：

```ts
import { ArabicToCyrillicConverter } from "@sarmay/kaz-converter";
import { CandidateLanguageModelDisambiguator } from "@sarmay/kaz-converter-lm";

const disambiguator = new CandidateLanguageModelDisambiguator({
  scorer: async (sentence) => {
    if (sentence.includes("Алма")) return 0.1;
    if (sentence.includes("Әлме")) return 0.9;
    return 1;
  },
  homographs: {
    "الما": ["Алма", "Әлме"]
  }
});

const converter = new ArabicToCyrillicConverter({
  useLm: true,
  disambiguator
});

console.log(await converter.convertAsync("الما بار."));
```

#### ONNX 模型目录与文件名自定义

`OnnxMaskedLanguageModelScorer.fromDirectory()` 和封装函数支持自定义文件名：

```ts
interface OnnxMaskedLanguageModelScorerDirectoryOptions {
  modelFileName?: string;
  tokenizerFileName?: string;
  tokenizerConfigFileName?: string;
  specialTokensMapFileName?: string;
}
```

默认值分别是：

- `model.onnx`
- `tokenizer.json`
- `tokenizer_config.json`
- `special_tokens_map.json`

如果你的导出结果文件名不同，可以直接覆盖这些字段。

### 3. 当前不支持运行时公开自定义的规则

下面这些目前是源码内规则，不是公开配置项：

- `VALID_SUFFIXES`
- `COMPOUND_PIVOT_ROOTS`
- `NAME_PREFIX_COMPONENTS`
- `NAME_SUFFIX_COMPONENTS`
- `IMPLICIT_SOFT_ROOTS`
- `EXCEPTIONS`
- `PROPER_NOUNS`
- `LOANWORD_PREFIXES`
- `LOANWORD_E_PREFIXES`

这意味着：

- 目前不能通过 `new ArabicToCyrillicConverter({ ... })` 直接传这些集合
- 也不能从 npm 包外部在运行时覆盖它们

这是当前版本的边界，需要在 README 里明确说清楚。

## 如果使用者想自定义这些内部规则，应该怎么做

当前推荐两种方式。

### 方式 1：先用公开 API 解决 80% 需求

优先使用：

- `homographs`
- `typoCandidates`
- 自定义 `SentenceScorer`
- 自定义 `ContextDisambiguator`
- `nameYSequenceStyle`
- `CyrillicToArabicOptions.lexicon`

因为这几种方式：

- 不需要 fork
- 兼容 npm 发布版本
- 升级成本低

### 方式 2：确实需要改内部规则时，做源码级自定义

如果你需要扩展：

- 某些常见后缀
- 某类人名构件
- 某些复合词 pivot
- 某些隐式前排词根

那么当前做法是直接修改源码中的常量。

主要位置：

- `packages/core/src/arb2syr.ts`
- `packages/core/src/lexicon.ts`

推荐流程：

1. fork 仓库或在自己项目里维护补丁
2. 修改对应规则集合
3. 在 `packages/core/test/converter.test.ts` 添加回归用例
4. 运行测试
5. 构建并在真实样本上验证

为什么目前没有把这些全做成公开配置：

- 这类规则非常底层，配置组合很多
- 一旦公开，就要承诺更强的向后兼容性
- 需要额外设计优先级、冲突解决、合并策略
- 当前版本先保证核心行为稳定

换句话说：

- “支持自定义”是支持的
- 但“这些底层规则支持运行时无痛配置”目前还没有公开接口

README 里最好明确区分这两层，不然用户会误以为所有规则都能直接传 options。

## 阿拉伯文 -> 西里尔文 API 详解

### `arb2syr(text, options?)`

同步规则转换入口。

适合：

- 浏览器
- 不需要上下文消歧
- 快速单次调用

签名：

```ts
arb2syr(text: string, options?: ArabicToCyrillicOptions): string
```

说明：

- 会做预处理、规则转换、大小写和标点整理
- 不会等待异步 LM 打分
- 当前实现中它也不会调用 `disambiguator`，所以如果你要启用上下文消歧，请使用 `arb2syrAsync()` 或 `convertAsync()`

### `arb2syrAsync(text, options?)`

异步转换入口。

签名：

```ts
arb2syrAsync(text: string, options?: ArabicToCyrillicOptions): Promise<string>
```

适合：

- 需要 LM 消歧
- 需要自定义异步 `disambiguator`

### `new ArabicToCyrillicConverter(options?)`

类实例适合复用配置。

方法：

- `convert(text: string): string`
- `convertAsync(text: string): Promise<string>`

建议：

- 无 LM 时可直接用 `convert`
- 有 LM 时优先用 `convertAsync`

额外说明：

- 当前实现里，`disambiguator` 只会在异步路径生效
- 也就是说，即便你创建实例时传入了 `disambiguator`，同步 `convert()` 仍然是纯规则路径

### `NoopDisambiguator`

一个空实现的 `ContextDisambiguator`。

作用：

- 占位
- 无任何上下文修正

它的行为就是直接返回规则初步转换结果。

## 西里尔文 -> 阿拉伯文 API 详解

### `syr2arb(text, options?)`

签名：

```ts
syr2arb(text: string, options?: CyrillicToArabicOptions): string
```

适合：

- 西里尔到 Tote Zhazu 的规则转换
- 无需 LM

### `new CyrillicToArabicConverter(options?)`

方法：

- `convert(text: string): string`

该方向当前的主要可自定义点是 `lexicon`，因为它依赖词根词典来做复合词拆分和借词判断。

## `@sarmay/kaz-converter-lm` API 详解

### `OnnxMaskedLanguageModelScorer`

作用：

- 把 ONNX masked LM 包装成一个句子打分器
- 对一个句子做 pseudo-log-likelihood 风格打分
- 分数越低表示句子越自然

主要方法：

```ts
OnnxMaskedLanguageModelScorer.create({
  modelPath,
  tokenizerPath,
  tokenizerConfigPath,
  specialTokensMapPath?
})

OnnxMaskedLanguageModelScorer.fromDirectory(directoryPath, options?)
```

内部做的事：

1. 加载 tokenizer
2. 加载 ONNX session
3. 解析 mask token 与 special tokens
4. 对句子逐 token mask
5. 计算平均负对数概率

### `CandidateLanguageModelDisambiguator`

作用：

- 接受一个 `SentenceScorer`
- 对命中的 `homographs` / `typoCandidates` 做逐候选比较
- 返回得分最低的最终句子版本

它只处理“候选选择”，不处理基础转写。

### `createOnnxDisambiguator(options)`

一步创建：

- `OnnxMaskedLanguageModelScorer`
- `CandidateLanguageModelDisambiguator`

适合不想手动装配 scorer 的使用者。

### `createOnnxArabicToCyrillicConverter(options)`

一步创建带 ONNX 消歧的 `ArabicToCyrillicConverter`。

这是最推荐的 Node.js + LM 入口。

## 模型目录要求

推荐目录：

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
- `merges.txt`

## 官方模型与下载

当前已有一个公开可下载的 Hugging Face 模型仓库：

- 模型主页：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx>
- 文件列表：<https://huggingface.co/sarmay/KazakhBERTmulti-onnx/tree/main>

在本仓库里下载：

```bash
npm run download:model:kazbert
```

如果你是从 npm 安装，而不是在本仓库里开发：

```bash
npx sarmay-kaz-download
```

也可以指定目录：

```bash
npx sarmay-kaz-download ./models/KazakhBERTmulti-onnx
```

这个下载流程支持：

- 已有文件跳过
- 大文件续传
- 网络失败重试

更完整说明见：

- [docs/model-download.md](docs/model-download.md)

## 如何接入你自己的模型

只要你的模型满足：

- 是 masked LM
- 能导出 ONNX
- tokenizer 能被 `@huggingface/tokenizers` 正常加载

就可以替换官方模型。

最简单的方式：

```ts
import { createOnnxArabicToCyrillicConverter } from "@sarmay/kaz-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "/absolute/path/to/my-own-model"
});
```

如果文件名不是默认值：

```ts
const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "/absolute/path/to/my-own-model",
  modelFileName: "kazakh-mlm.onnx",
  tokenizerFileName: "tok.json",
  tokenizerConfigFileName: "tok_config.json",
  specialTokensMapFileName: "special.json"
});
```

## 自定义候选词与业务规则

这通常是项目落地时最有价值的自定义点。

### 自定义同形词

```ts
import { createOnnxDisambiguator } from "@sarmay/kaz-converter-lm";

const disambiguator = await createOnnxDisambiguator({
  modelDirectory: "./models/KazakhBERTmulti-onnx",
  homographs: {
    "الما": ["Алма", "Әлме"],
    "اكە": ["Әке", "Ака"]
  }
});
```

### 自定义脏数据候选

```ts
const disambiguator = await createOnnxDisambiguator({
  modelDirectory: "./models/KazakhBERTmulti-onnx",
  typoCandidates: {
    "داستۇرلەر": ["дастұрлер", "дәстүрлер"]
  }
});
```

### 什么时候该加 `homographs`

适合：

- 这个阿拉伯文词确实对应多个合理西里尔候选
- 规则无法只靠词内信息稳定判断
- 需要靠上下文决定

### 什么时候该加 `typoCandidates`

适合：

- 用户输入经常不规范
- 不是标准转写歧义，而是脏数据修正
- 你希望保留多个修正可能，再交给句子 scorer 决定

## 如何判断应该把问题交给规则还是 LM

推荐原则：

- 稳定、确定、可解释的问题，优先交给规则
- 少量高频歧义、同形词、脏数据候选，交给 LM
- 不要让 LM 去承担所有基础转写职责

更具体地说：

- 字母级映射：规则
- 后缀识别：规则
- 专名和高频例外：规则
- 同形词候选选择：LM
- 脏数据候选排序：LM

这样做的好处是：

- 结果更稳定
- 可解释性更强
- 测试和回归更容易
- 模型可替换

## 如何给这些规则集合增量维护

对于 `VALID_SUFFIXES`、`IMPLICIT_SOFT_ROOTS`、`NAME_SUFFIX_COMPONENTS` 这类集合，推荐使用下面的纳入标准。

建议加入的情况：

- 高频真实错例
- 一个规则能修复一类问题，而不是只修一个孤例
- 对人名、地名、机构名这类敏感内容有显著收益
- 已经在测试或线上样本中重复出现

不建议加入的情况：

- 极低频孤例
- 依赖上下文而不是词内结构才能判断
- 会明显破坏已有大批正确转换
- 本质上更适合交给 LM 候选排序

简单说：

- 能用结构规则解决，就优先加规则
- 需要上下文比较，就优先做成候选 + LM

## 仓库内示例

浏览器示例：

- [examples/browser-demo.html](examples/browser-demo.html)

模型下载示例页：

- [examples/model-download.html](examples/model-download.html)

Node.js 自定义 scorer 示例：

- [examples/node-custom-scorer-demo.mjs](examples/node-custom-scorer-demo.mjs)

Node.js ONNX 示例：

- [examples/node-onnx-scorer-demo.mjs](examples/node-onnx-scorer-demo.mjs)

## 维护者：如何导出自己的模型

仓库内置脚本：

```bash
npm run export:model:kazbert
```

或者导出指定 Hugging Face masked LM：

```bash
node scripts/export-hf-mlm-to-onnx.mjs <model-id> <output-dir>
```

例如：

```bash
node scripts/export-hf-mlm-to-onnx.mjs nur-dev/roberta-kaz-large models/roberta-kaz-large-onnx
```

如果需要代理：

```bash
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890
```

更完整说明见：

- [docs/training-kazakh-lm.md](docs/training-kazakh-lm.md)

## 发布建议

不要把模型打进 npm 包。

推荐：

1. 把模型目录打成 zip
2. 上传到 GitHub Releases、Hugging Face 或对象存储
3. 在文档里告诉使用者下载并解压
4. 让使用者只传 `modelDirectory`

发布顺序建议：

1. 先发布 `@sarmay/kaz-converter`
2. 再发布 `@sarmay/kaz-converter-lm`

完整发布流程见：

- [docs/release-npm.md](docs/release-npm.md)

## 本地开发

安装依赖：

```bash
npm install
```

构建：

```bash
npm run build
```

测试：

```bash
npm test
```

检查打包内容：

```bash
npm run pack:dry
```

## 给 README 读者的最后一个重要提醒

如果你看到像下面这些集合：

- `IMPLICIT_SOFT_ROOTS`
- `NAME_SUFFIX_COMPONENTS`
- `NAME_PREFIX_COMPONENTS`
- `COMPOUND_PIVOT_ROOTS`
- `VALID_SUFFIXES`

不要把它们理解成“完整词库”。

它们更准确的角色是：

- 高价值启发式集合
- 规则转换质量补丁层
- 真实回归案例驱动的工程资产

它们不需要穷尽所有哈萨克词语，依然有非常大的价值，因为：

- 它们修的是高频错误
- 它们解决的是结构性问题
- 它们让规则系统在不依赖大模型的情况下先尽可能稳定
- 它们和 LM 形成互补，而不是互相替代

如果你的业务中出现了新的人名模式、新的后缀组合、新的高频词根，最务实的做法不是期待一个静态列表永远完整，而是：

1. 先判断这个问题该归规则还是归 LM
2. 选择公开 API 自定义，或源码级维护补丁
3. 把案例补进测试
4. 持续迭代

这才是这个项目的推荐使用方式。
