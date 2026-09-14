import postgres from 'postgres';

/**
 * Direct Postgres connection, used ONLY on the server for the one thing
 * the Supabase REST client can't do: a real multi-statement transaction
 * (SELECT ... FOR UPDATE, then INSERT, then UPDATE, all-or-nothing).
 *
 * Everything else in the app should keep using the normal Supabase
 * client (lib/supabase/server.ts / client.ts) — this is a narrow
 * exception for lib/points.ts only.
 */
const sql = postgres(process.env.SUPABASE_DB_URL!, {
  ssl: 'require',
  max: 5,
});

export default sql;