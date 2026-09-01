import { spawnSync } from "node:child_process";

import {
  assertDangerousScriptAllowed,
  assertNotProductionUnlessAllowed,
} from "../src/lib/ops/script-guards";

assertDangerousScriptAllowed("db:push");
assertNotProductionUnlessAllowed("db:push");

const result = spawnSync(
  "npx",
  ["drizzle-kit", "push", ...process.argv.slice(2)],
  { stdio: "inherit", shell: true },
);
process.exit(result.status ?? 1);
