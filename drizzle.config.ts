import { defineConfig } from "drizzle-kit";

// Drizzle Kit is used here for introspection, studio, and *future* generated
// migrations. The initial 0001_init.sql migration in supabase/migrations is
// hand-written so we can encode constraints/triggers that Drizzle doesn't
// model yet. Subsequent migrations can be produced with `npm run db:generate`.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL ?? "",
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
