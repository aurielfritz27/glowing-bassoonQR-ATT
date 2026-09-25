// Quick health check for the Supabase database used by the app.
//
//   npm run db:check
//
// It asks the REST API for each table the app needs and reports the PostgREST
// error when a table is missing (PGRST205 = "Could not find the table ... in the
// schema cache", which means supabase/schema.sql has not been run yet).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const TABLES = ['profiles', 'events', 'attendance'];

function readEnv(key) {
  if (process.env[key]) return process.env[key];

  try {
    const contents = readFileSync(join(projectRoot, '.env'), 'utf8');
    const line = contents.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf('=') + 1).trim() : '';
  } catch {
    return '';
  }
}

const url = readEnv('EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
const key = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

console.log(`Checking ${url}\n`);

const headers = { apikey: key, Authorization: `Bearer ${key}` };
let missing = 0;

for (const table of TABLES) {
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });

    if (response.ok) {
      console.log(`OK      ${table}`);
      continue;
    }

    const body = await response.json().catch(() => ({}));
    missing += 1;
    console.log(`MISSING ${table}  ->  ${body.code ?? response.status} ${body.message ?? ''}`);
  } catch (error) {
    console.log(`ERROR   ${table}  ->  ${error.message}`);
    process.exitCode = 1;
  }
}

if (missing) {
  console.log('\nThe tables above are missing. Apply the schema with either:');
  console.log('  1. npm run db:apply          (needs SUPABASE_ACCESS_TOKEN, see the script header)');
  console.log('  2. Paste supabase/schema.sql into the Supabase dashboard SQL Editor and press Run,');
  console.log('     then reload the API cache: Project Settings -> API -> Reload schema cache.');
  console.log('Re-run "npm run db:check" afterwards.');
  process.exitCode = 1;
} else {
  console.log('\nDatabase looks ready.');
}
