import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineWorkersConfig(async () => {
  // Lee las migraciones SQL para aplicarlas a la D1 en memoria durante los tests.
  const migrations = await readD1Migrations(path.join(dir, "migrations"));

  return {
    test: {
      setupFiles: ["./tests/apply-migrations.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            compatibilityDate: "2025-04-01",
            compatibilityFlags: ["nodejs_compat"],
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
