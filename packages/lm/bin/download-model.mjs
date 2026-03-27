#!/usr/bin/env node

import process from "node:process";

import { DEFAULT_OUTPUT_DIR, DEFAULT_REPO_ID, downloadModel } from "./download-model-lib.mjs";

const [, , outputDir = DEFAULT_OUTPUT_DIR, repoId = DEFAULT_REPO_ID] = process.argv;

await downloadModel({ outputDir, repoId });
