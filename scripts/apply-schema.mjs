// Applies supabase/schema.sql to your Supabase project through the Management API
// (the same thing the dashboard SQL Editor does, so it can create tables).
//
//   $env:SUPABASE_ACCESS_TOKEN='sbp_...'   # PowerShell
//   npm run db:apply
//
// Get a token from https://supabase.com/dashboard/account/tokens ("database:write"
// permission). Keep it in your shell environment - do NOT put it in .env, because
// that file is tracked by git. Check first without sending anything:
//
//   npm run db:apply -- --dry-run
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

function readEnvFile(key) {
  if (process.env[key]) return process.env[key];

  try {
    const contents = readFileSync(join(root, '.env'), 'utf8');
    const line = contents.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf('=') + 1).trim() : '';
  } catch {
    return '';
  }
}

/** Splits a SQL script on ";" while ignoring quotes, dollar-quoted bodies and comments. */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let dollarTag = null;
  let inSingleQuote = false;
  let inLineComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      current += char;
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (dollarTag) {
      if (char === '$' && sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
        continue;
      }
      current += char;
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "'") {
        if (next === "'") {
          current += next;
          index += 1;
        } else {
          inSingleQuote = false;
        }
      }
      continue;
    }

    if (char === '-' && next === '-') {
      inLineComment = true;
      current += char;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }

    if (char === '$') {
      const match = /^\$[A-Za-z_]*\$/.exec(sql.slice(index));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }

    if (char === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());

  return statements.filter((statement) =>
    statement
      .split(/\r?\n/)
      .some((line) => line.trim() && !line.trim().startsWith('--'))
  );
}

const url = readEnvFile('EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
const ref = process.env.SUPABASE_PROJECT_REF || /^https?:\/\/([a-z0-9-]+)\.supabase\.(?:co|in)\b/i.exec(url)?.[1] || '';
const sql = readFileSync(join(root, 'supabase/schema.sql'), 'utf8');
const statements = splitStatements(sql);

console.log(`Schema file : supabase/schema.sql (${statements.length} statements)`);
console.log(`Project ref : ${ref || '(not found - set SUPABASE_PROJECT_REF)'}`);
console.log(`Dashboard   : https://supabase.com/dashboard/project/${ref}/sql/new\n`);

if (dryRun) {
  statements.forEach((statement, index) => {
    const firstLine = statement.split(/\r?\n/).find((line) => line.trim() && !line.trim().startsWith('--')) ?? '';
    console.log(`${String(index + 1).padStart(2)}. ${firstLine.trim().slice(0, 72)}`);
  });
  console.log('\nDry run - nothing was sent.');
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN.');
  console.error('Create one at https://supabase.com/dashboard/account/tokens with the database:write permission, then run:');
  console.error("  $env:SUPABASE_ACCESS_TOKEN='sbp_...'; npm run db:apply");
  console.error(`Or paste supabase/schema.sql into https://supabase.com/dashboard/project/${ref}/sql/new and press Run.`);
  process.exit(1);
}

if (!ref) {
  console.error('Could not work out the project ref. Set it manually, e.g. $env:SUPABASE_PROJECT_REF="your-project-ref".');
  process.exit(1);
}

for (const [index, statement] of statements.entries()) {
  const label = (statement.split(/\r?\n/).find((line) => line.trim() && !line.trim().startsWith('--')) ?? '').trim().slice(0, 60);
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: statement }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`\nFailed at statement ${index + 1}: ${label}`);
    console.error(`HTTP ${response.status}: ${body.slice(0, 400)}`);
    if (response.status === 401) console.error('The access token is invalid or expired.');
    if (response.status === 403) console.error('The token is missing the database:write permission.');
    if (response.status === 404) console.error('The project ref is wrong - compare it with the URL of your project.');
    process.exit(1);
  }

  const body = await response.text();
  console.log(`OK  ${String(index + 1).padStart(2)}. ${label}`);
  if (statement.startsWith('select') && body && body !== '[]') console.log(`    ${body.slice(0, 300)}`);
}

console.log('\nSchema applied. Next: npm run db:check');
