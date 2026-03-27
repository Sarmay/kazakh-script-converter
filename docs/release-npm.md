# npm 发布说明

这份文档面向仓库维护者。

当前仓库会发布两个 npm 包：

1. `@sarmay/kaz-converter`
2. `@sarmay/kaz-converter-lm`

发布顺序必须固定：

1. 先发核心包
2. 再发 LM 包

原因是 `@sarmay/kaz-converter-lm` 依赖 `@sarmay/kaz-converter`。

## 发布前要改什么

### 1. 更新版本号

需要同时检查：

- [packages/core/package.json](../packages/core/package.json)
- [packages/lm/package.json](../packages/lm/package.json)

至少要保证：

- 两个包的 `version` 已更新
- `packages/lm/package.json` 里的 `dependencies["@sarmay/kaz-converter"]` 与核心包版本一致

例如核心包版本改成 `0.1.1` 后，LM 包依赖要改成：

```json
"@sarmay/kaz-converter": "^0.1.1"
```

### 2. 确认包元数据

已经补齐的字段包括：

- `author`
- `repository`
- `homepage`
- `bugs`
- `publishConfig`

自动校验命令：

```bash
node scripts/validate-package-metadata.mjs
```

## 发布前完整检查

推荐直接跑：

```bash
npm run release:check
```

它会执行：

1. 元数据校验
2. 安装依赖
3. 构建两个包
4. 运行测试
5. dry-run 打包
6. 检查当前 npm 登录用户

如果你还没登录 npm：

```bash
npm login
```

## 真正发布

先发布核心包：

```bash
npm run publish:core
```

然后发布 LM 包：

```bash
npm run publish:lm
```

也可以连续执行：

```bash
npm run publish:all
```

但更稳妥的做法仍然是手动两步：

1. `npm run publish:core`
2. 确认 npm 上核心包已可见
3. `npm run publish:lm`

## 发布后检查

发布后建议至少验证：

```bash
npm view @sarmay/kaz-converter version
npm view @sarmay/kaz-converter-lm version
```

然后再做一次真实安装验证：

```bash
mkdir /tmp/kazakh-npm-smoke
cd /tmp/kazakh-npm-smoke
npm init -y
npm install @sarmay/kaz-converter @sarmay/kaz-converter-lm
npx sarmay-kaz-download
```

## 模型仓库

当前配套 Hugging Face 模型仓库：

- <https://huggingface.co/sarmay/KazakhBERTmulti-onnx>

如果你更新了模型，也建议同步检查以下文档：

- [docs/model-download.md](model-download.md)
- [packages/lm/README.md](../packages/lm/README.md)
- [README.md](../README.md)
