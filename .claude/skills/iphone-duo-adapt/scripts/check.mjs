// Syntax-check the use_figma scripts locally (they use top-level await/return, so wrap them).
// Usage: node .claude/skills/iphone-duo-adapt/scripts/check.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let ok = true;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  const src = readFileSync(join(dir, f), "utf8");
  try {
    new AsyncFunction("figma", src);
    const m = src.match(/^const PARAMS = (.*);$/m);
    if (!m) throw new Error("missing single-line `const PARAMS = {...};`");
    console.log(`ok   ${f}  ${src.length} chars (use_figma limit 50000)`);
    if (src.length > 50000) { ok = false; console.log("     too long for use_figma"); }
  } catch (e) {
    ok = false;
    console.log(`FAIL ${f}: ${e.message}`);
  }
}
process.exit(ok ? 0 : 1);
