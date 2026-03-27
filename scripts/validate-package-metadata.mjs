import { readFile } from "node:fs/promises";

const packagePaths = ["packages/core/package.json", "packages/lm/package.json"];

function getValue(object, path) {
  return path.split(".").reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), object);
}

function assertField(packagePath, pkg, fieldPath, errors) {
  const value = getValue(pkg, fieldPath);
  if (value === undefined || value === null || value === "") {
    errors.push(`${packagePath}: missing ${fieldPath}`);
  }
}

const packages = await Promise.all(
  packagePaths.map(async (packagePath) => {
    const content = await readFile(new URL(`../${packagePath}`, import.meta.url), "utf8");
    return {
      packagePath,
      pkg: JSON.parse(content)
    };
  })
);

const errors = [];

for (const { packagePath, pkg } of packages) {
  for (const field of [
    "name",
    "version",
    "author.name",
    "author.url",
    "repository.type",
    "repository.url",
    "repository.directory",
    "homepage",
    "bugs.url",
    "publishConfig.access",
    "publishConfig.registry"
  ]) {
    assertField(packagePath, pkg, field, errors);
  }

  if (pkg.publishConfig?.access !== "public") {
    errors.push(`${packagePath}: publishConfig.access must be "public"`);
  }

  if (pkg.publishConfig?.registry !== "https://registry.npmjs.org/") {
    errors.push(`${packagePath}: publishConfig.registry must be "https://registry.npmjs.org/"`);
  }

  if (pkg.repository?.type !== "git") {
    errors.push(`${packagePath}: repository.type must be "git"`);
  }

  if (pkg.repository?.url !== "git+https://github.com/Sarmay/kazakh-script-converter.git") {
    errors.push(
      `${packagePath}: repository.url must be "git+https://github.com/Sarmay/kazakh-script-converter.git"`
    );
  }

  if (pkg.bugs?.url !== "https://github.com/Sarmay/kazakh-script-converter/issues") {
    errors.push(`${packagePath}: bugs.url must be "https://github.com/Sarmay/kazakh-script-converter/issues"`);
  }
}

const core = packages.find(({ pkg }) => pkg.name === "@sarmay/kaz-converter")?.pkg;
const lm = packages.find(({ pkg }) => pkg.name === "@sarmay/kaz-converter-lm")?.pkg;

if (!core) {
  errors.push('missing package "@sarmay/kaz-converter"');
}

if (!lm) {
  errors.push('missing package "@sarmay/kaz-converter-lm"');
}

if (core && lm) {
  const expectedCoreRange = `^${core.version}`;
  if (lm.dependencies?.["@sarmay/kaz-converter"] !== expectedCoreRange) {
    errors.push(
      `packages/lm/package.json: dependency @sarmay/kaz-converter must be "${expectedCoreRange}" but found "${lm.dependencies?.[
        "@sarmay/kaz-converter"
      ] ?? "undefined"}"`
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

for (const { packagePath, pkg } of packages) {
  console.log(`ok ${pkg.name}@${pkg.version} (${packagePath})`);
}
