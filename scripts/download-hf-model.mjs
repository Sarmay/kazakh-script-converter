import { mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import process from "node:process";

const [, , repoId = "sarmay/KazakhBERTmulti-onnx", outputDir = "models/KazakhBERTmulti-onnx"] = process.argv;

const files = [
  "model.onnx",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "config.json",
  "vocab.txt"
];

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function runCurl(url, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("curl", ["-L", "--fail", url, "-o", outputPath], {
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`curl exited with code ${code} while downloading ${url}`));
      }
    });
  });
}

await mkdir(outputDir, { recursive: true });

for (const fileName of files) {
  const outputPath = join(outputDir, fileName);
  if (await fileExists(outputPath)) {
    console.log(`skip ${fileName}`);
    continue;
  }

  const url = `https://huggingface.co/${repoId}/resolve/main/${fileName}`;
  console.log(`download ${fileName} -> ${outputPath}`);
  await runCurl(url, outputPath);
}

console.log(`done: ${outputDir}`);
