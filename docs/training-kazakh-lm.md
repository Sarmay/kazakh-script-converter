# 提升精度：训练或微调哈萨克语 LM 参考

这份文档面向想提升 `@sarmay/kaz-converter-lm` 消歧精度的维护者。

当前仓库的 LM 接入方式不是“让模型直接做全文转换”，而是：

1. 规则引擎先给出稳定的基础转换。
2. 只对少量歧义词和脏数据候选做二选一或多选一。
3. 语言模型负责给候选句打分，选择更自然的那一个。

这意味着你的训练目标不是“万能翻译模型”，而是“对哈萨克语句子自然度足够敏感的 masked LM”。

## 1. 先确定目标

优先优化下面这类问题：

- 同形歧义词：`الما -> Алма / Әлме`
- 读音或拼写纠错：`اكەم -> Әкем`
- 高频短语自然度：`بىر كۇنى -> Бір күні`
- 业务域文本：新闻、教育、政务、百科、地名、人名

建议单独维护一份歧义评测集，至少包含：

- 阿拉伯文输入
- 规则引擎候选
- 正确目标句
- 干扰候选句
- 场景标签

## 2. 基座模型怎么选

当前更适合本项目的方向是哈萨克语专用或偏哈萨克语的 masked LM，而不是通用多语模型。

推荐优先级：

1. 先从已有哈萨克语 MLM 继续预训练，例如 `amandyk/KazakhBERTmulti`
2. 如果你有更大的资源预算，再尝试 `nur-dev/roberta-kaz-large`
3. 如果你的文本域非常垂直，也可以从自己的语料重新训练 tokenizer + MLM

选择标准：

- 必须是 masked LM，而不是纯生成式 causal LM
- 最终能导出成 ONNX
- tokenizer 能稳定产出 `tokenizer.json`

## 3. 训练数据怎么准备

建议至少准备三类数据。

### 3.1 通用哈萨克语句子语料

来源可以是：

- 新闻
- 维基/百科
- 政务公文
- 教育文本
- 论坛或社区内容

要求：

- 尽量是西里尔文哈萨克语
- 清洗乱码、重复、极短文本
- 保留真实标点和数字上下文

### 3.2 针对转换器的歧义集

这部分最重要，因为它直接决定你在项目里的收益。

建议格式：

```json
{
  "arabic": "بىر كۇنى",
  "candidates": ["Бір күні", "Бұр күні"],
  "target": "Бір күні",
  "domain": "common_phrase"
}
```

来源可以是：

- 真实用户输入
- 线上错例
- 回归测试新增 case
- 从词典或规则中人工枚举

### 3.3 噪声和脏数据样本

例如：

- 少字、多字、错别字
- 阿拉伯文输入不规范
- 混合标点、数字、拉丁字母

这类数据有助于模型在“候选句打分”时更稳。

## 4. 训练方式建议

### 方案 A：继续预训练 masked LM

最现实，也最推荐。

做法：

1. 从现有哈萨克语 MLM 开始。
2. 用大规模哈萨克语语料继续 MLM 训练。
3. 再用你的歧义句集合做额外 domain adaptation。

优点：

- 与当前 ONNX scorer 兼容最好
- 不需要改 npm 包接口
- 风险最低

### 方案 B：专门做句子打分模型

如果你后面发现 masked LM 的 pseudo-log-likelihood 不够稳，也可以训练一个专门的句子排序模型。

例如：

- 输入两个候选句
- 输出哪个更自然

但这样通常要改 `SentenceScorer` 的实现逻辑，不如方案 A 直接复用现有接口简单。

## 5. 评估不要只看 MLM loss

真正重要的是项目内指标。

建议至少跟踪三类评估：

### 5.1 候选句排序准确率

给定：

- 正确句
- 错误句

看模型能否始终给正确句更低分。

### 5.2 转换端到端准确率

直接跑：

- `arb2syrAsync()`

统计：

- 整句正确率
- 歧义词命中率
- 高频错词 Top N

### 5.3 域内稳定性

单独看：

- 新闻域
- 教育域
- 地名人名
- 短语固定搭配

不要只看总体平均值。

## 6. 导出成 ONNX

仓库已经提供导出脚本：

```bash
npm run export:model:kazbert
```

或者导出别的 Hugging Face masked LM：

```bash
node scripts/export-hf-mlm-to-onnx.mjs <model-id> <output-dir>
```

例如：

```bash
node scripts/export-hf-mlm-to-onnx.mjs nur-dev/roberta-kaz-large models/roberta-kaz-large-onnx
```

导出后应至少有：

```txt
model.onnx
tokenizer.json
tokenizer_config.json
```

## 7. 怎么把训练后的模型接进 npm 包

一旦模型目录准备好，使用者只需要：

```ts
import { createOnnxArabicToCyrillicConverter } from "@sarmay/kaz-converter-lm";

const converter = await createOnnxArabicToCyrillicConverter({
  modelDirectory: "./models/your-model"
});
```

所以你交付模型时，最重要的不是论文，而是这三件事：

1. 给用户一个能下载的压缩包
2. 保证解压后目录结构正确
3. 保证 README 里只需要填写一个路径

## 8. 模型发布建议

建议把模型单独发，不要塞进 npm 包。

原因：

- 模型太大
- npm 安装体验会很差
- 用户往往需要自己选择模型版本

更适合的分发方式：

- GitHub Releases
- Hugging Face model repo
- 对象存储直链

推荐发布物格式：

```txt
KazakhBERTmulti-onnx.zip
```

用户下载后解压到：

```txt
models/KazakhBERTmulti-onnx
```

## 9. 什么时候考虑第三个 npm 包

当前不建议拆第三个包。

只有当你确定下面任一情况成立时，再拆：

- 需要浏览器侧 ONNX 推理
- 需要单独维护模型下载器
- 需要把训练工具链也打包成 CLI

在当前阶段，两个包已经足够：

- `@sarmay/kaz-converter`
- `@sarmay/kaz-converter-lm`
