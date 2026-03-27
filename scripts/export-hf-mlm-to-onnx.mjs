import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import process from "node:process";

const [, , modelId = "amandyk/KazakhBERTmulti", outputDir = "models/KazakhBERTmulti-onnx", ...extraArgs] =
  process.argv;

const venvDir = ".venv-onnx-export";
const binDirectory = process.platform === "win32" ? "Scripts" : "bin";
const pythonExecutable = process.platform === "win32" ? "python.exe" : "python";
const pipExecutable = process.platform === "win32" ? "pip.exe" : "pip";
const venvPythonPath = join(venvDir, binDirectory, pythonExecutable);
const venvPipPath = join(venvDir, binDirectory, pipExecutable);

const basePythonCandidates = [
  process.env.PYTHON,
  "python3.12",
  "python3.11",
  "python3.10",
  "python3"
].filter((value) => Boolean(value));

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? "inherit",
      env: options.env ?? process.env
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function runQuietly(command, args, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      env
    });

    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBasePython() {
  for (const candidate of basePythonCandidates) {
    if (await runQuietly(candidate, ["--version"])) {
      return candidate;
    }
  }

  throw new Error("Could not find a compatible Python interpreter. Set PYTHON=python3.12, python3.11, or python3.10.");
}

async function ensureVenv() {
  if (await pathExists(venvPythonPath)) {
    return;
  }

  const basePython = await resolveBasePython();
  await run(basePython, ["-m", "venv", venvDir]);
}

async function ensureDependencies(env) {
  const isReady = await runQuietly(
    venvPythonPath,
    ["-c", "import accelerate, torch, transformers; from optimum.exporters.onnx import main_export"],
    env
  );

  if (isReady) {
    return;
  }

  await run(
    venvPipPath,
    ["install", "-U", "pip", "optimum[onnxruntime]", "transformers", "onnx", "onnxruntime", "torch", "accelerate"],
    env
  );
}

const exportEnv = {
  ...process.env,
  HF_HUB_DISABLE_XET: process.env.HF_HUB_DISABLE_XET ?? "1"
};

await ensureVenv();
await ensureDependencies(exportEnv);
await run(
  venvPythonPath,
  [
    "scripts/export-hf-mlm-to-onnx.py",
    "--model",
    modelId,
    "--output",
    outputDir,
    "--cache-dir",
    ".hf-cache",
    ...extraArgs
  ],
  { env: exportEnv }
);
