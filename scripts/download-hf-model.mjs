import process from "node:process";

import {
  DEFAULT_OUTPUT_DIR,
  DEFAULT_REPO_ID,
  downloadModel
} from "../packages/lm/bin/download-model-lib.mjs";

const [, , repoId = DEFAULT_REPO_ID, outputDir = DEFAULT_OUTPUT_DIR] = process.argv;

await downloadModel({ outputDir, repoId });
