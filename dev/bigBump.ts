import { readFileSync, writeFileSync } from "fs";

const files = ["./package.json", "./frontend/package.json"];

for (const f of files) {
  const pkg = JSON.parse(readFileSync(f, "utf-8"));
  const [major, minor, patch] = pkg.version.split(".").map(Number);
  pkg.version = `${major}.${minor + 1}.0`;
  writeFileSync(f, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ${f}  ${major}.${minor}.${patch} → ${pkg.version}`);
}
