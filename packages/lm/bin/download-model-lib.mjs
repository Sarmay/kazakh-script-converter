import { mkdir, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

export const DEFAULT_REPO_ID = "sarmay/KazakhBERTmulti-onnx";
export const DEFAULT_OUTPUT_DIR = "models/KazakhBERTmulti-onnx";
export const DEFAULT_FILES = [
  "model.onnx",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "config.json",
  "vocab.txt"
];
const CURL_RETRY_ARGS = ["--retry", "5", "--retry-delay", "2", "--retry-all-errors"];

export function parseContentLength(headerText) {
  const matches = Array.from(headerText.matchAll(/^content-length:\s*(\d+)\s*$/gim), (match) => Number(match[1]));
  return matches.length > 0 ? matches.at(-1) : null;
}

export function getDownloadPlan(localSize, remoteSize) {
  if (typeof localSize !== "number" || localSize <= 0) {
    return { action: "download", reason: "missing local file" };
  }

  if (typeof remoteSize !== "number" || remoteSize <= 0) {
    return { action: "restart", reason: "remote size unavailable" };
  }

  if (localSize === remoteSize) {
    return { action: "skip", reason: "local file matches remote size" };
  }

  if (localSize < remoteSize) {
    return { action: "resume", reason: "local file is incomplete" };
  }

  return { action: "restart", reason: "local file is larger than remote file" };
}

async function getFileSize(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

function runCurl(args, { captureOutput = false } = {}) {
  return new Promise((resolve, reject) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const child = spawn("curl", args, {
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      env: process.env
    });

    if (captureOutput) {
      child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
      child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8")
        });
        return;
      }

      reject(
        new Error(
          `curl exited with code ${code} for args: ${args.join(" ")}${
            captureOutput && stderrChunks.length > 0 ? `\n${Buffer.concat(stderrChunks).toString("utf8")}` : ""
          }`
        )
      );
    });
  });
}

async function getRemoteFileSize(url) {
  const { stdout } = await runCurl(
    ["-L", "--fail", "--silent", "--show-error", ...CURL_RETRY_ARGS, "-I", url],
    { captureOutput: true }
  );
  return parseContentLength(stdout);
}

async function downloadFile(url, outputPath) {
  const remoteSize = await getRemoteFileSize(url);
  const localSize = await getFileSize(outputPath);
  const plan = getDownloadPlan(localSize, remoteSize);

  if (plan.action === "skip") {
    console.log(`skip ${outputPath} (${localSize} bytes)`);
    return;
  }

  if (plan.action === "restart") {
    if (localSize) {
      console.log(`restart ${outputPath} (${plan.reason})`);
      await rm(outputPath, { force: true });
    } else {
      console.log(`download ${outputPath}`);
    }
  } else if (plan.action === "resume") {
    console.log(`resume ${outputPath} (${localSize}/${remoteSize} bytes)`);
  } else {
    console.log(`download ${outputPath}`);
  }

  const args = ["-L", "--fail", ...CURL_RETRY_ARGS, "--output", outputPath];
  if (plan.action === "resume") {
    args.push("-C", "-");
  }
  args.push(url);
  await runCurl(args);

  const finalSize = await getFileSize(outputPath);
  if (typeof remoteSize === "number" && finalSize !== remoteSize) {
    throw new Error(`downloaded size mismatch for ${outputPath}: expected ${remoteSize}, got ${finalSize ?? "missing"}`);
  }
}

export async function downloadModel({
  outputDir = DEFAULT_OUTPUT_DIR,
  repoId = DEFAULT_REPO_ID,
  files = DEFAULT_FILES
} = {}) {
  await mkdir(outputDir, { recursive: true });

  for (const fileName of files) {
    const outputPath = join(outputDir, fileName);
    const url = `https://huggingface.co/${repoId}/resolve/main/${fileName}`;
    await downloadFile(url, outputPath);
  }

  console.log(`done: ${outputDir}`);
}
