import { applyD1Migrations, env } from "cloudflare:test";

// Aplica las migraciones D1 a la base en memoria antes de los tests.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
