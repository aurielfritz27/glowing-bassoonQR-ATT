// Behavioural check for lib/profiles.ts without a real Supabase project.
//
//   npm run test:profile
//
// The real module is transpiled with the project's own TypeScript compiler and
// linked against a stubbed Supabase client, so the student -> teacher flow can
// be verified offline. Nothing is left behind: the generated files are removed
// again before the script exits.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'lib');
const stubPath = join(lib, '.stub-supabase.mjs');
const modulePath = join(lib, '.stub-profiles.mjs');

const STUB = `export const supabaseProjectRef = 'test-project';

export const stub = {
  tables: [],
  updatedQuery: null,
  insertedRow: null,
  updateResult: { data: null, error: null },
  insertResult: { data: null, error: null },
  updateUserResult: { error: null },
  updateUserCalls: [],
};

function builder() {
  let operation = null;

  const api = {
    update(query) {
      operation = 'update';
      stub.updatedQuery = query;
      return api;
    },
    insert(row) {
      operation = 'insert';
      stub.insertedRow = row;
      return api;
    },
    select() {
      return api;
    },
    eq() {
      return api;
    },
    maybeSingle() {
      return Promise.resolve(stub.updateResult);
    },
    single() {
      return Promise.resolve(operation === 'insert' ? stub.insertResult : stub.updateResult);
    },
  };

  return api;
}

export const supabase = {
  from(table) {
    stub.tables.push(table);
    return builder();
  },
  auth: {
    async updateUser(payload) {
      stub.updateUserCalls.push(payload);
      return stub.updateUserResult;
    },
  },
};
`;

function loadProfilesModule() {
  const source = readFileSync(join(lib, 'profiles.ts'), 'utf8');
  const output = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace("'./supabase'", "'./.stub-supabase.mjs'");

  writeFileSync(stubPath, STUB);
  writeFileSync(modulePath, output);
}

const toUrl = (path) => `file://${path.replace(/\\/g, '/')}`;

loadProfilesModule();
const profiles = await import(toUrl(modulePath));
const { stub } = await import(toUrl(stubPath));

const user = {
  id: 'u1',
  email: 'ann@school.edu',
  user_metadata: { full_name: 'Ann Cruz', role: 'student' },
};
const row = (role) => ({
  id: 'u1',
  email: 'ann@school.edu',
  full_name: 'Ann Cruz',
  role,
  created_at: '',
  updated_at: '',
});

const checks = [];
const check = (name, condition) => checks.push({ name, pass: !!condition });
const reset = () => {
  stub.updatedQuery = null;
  stub.insertedRow = null;
  stub.updateUserCalls.length = 0;
};

// 1. The student -> teacher switch on an existing profile.
reset();
stub.updateResult = { data: row('teacher'), error: null };
let result = await profiles.updateProfile(user, { full_name: 'Ann Cruz', role: 'teacher' });
check('existing profile: role saved as teacher', result.profile?.role === 'teacher' && !result.error);
check('existing profile: updated_at sent', typeof stub.updatedQuery?.updated_at === 'string');
check('existing profile: auth metadata synced', stub.updateUserCalls[0]?.data?.role === 'teacher');
check('existing profile: does not insert again', stub.insertedRow === null);

// 2. The switch when the profile row is missing (no trigger / legacy account).
reset();
stub.updateResult = { data: null, error: null };
stub.insertResult = { data: row('teacher'), error: null };
result = await profiles.updateProfile(user, { full_name: 'Ann Cruz', role: 'teacher' });
check('missing profile: creates the row', stub.insertedRow?.id === 'u1' && stub.insertedRow?.role === 'teacher');
check('missing profile: keeps email and full name', stub.insertedRow?.email === 'ann@school.edu' && stub.insertedRow?.full_name === 'Ann Cruz');
check('missing profile: returns the new teacher profile', result.profile?.role === 'teacher' && !result.error);

// 3. ensureProfile used by the profile screen.
reset();
stub.updateResult = { data: null, error: null };
stub.insertResult = { data: row('teacher'), error: null };
result = await profiles.ensureProfile(user);
check('ensureProfile creates a missing row', stub.insertedRow?.id === 'u1' && result.profile?.role === 'teacher');

reset();
stub.updateResult = { data: row('student'), error: null };
result = await profiles.ensureProfile(user);
check('ensureProfile reuses an existing row', stub.insertedRow === null && result.profile?.role === 'student');

// 4. The PGRST205 "schema cache" error seen in the app.
const schemaError = {
  code: 'PGRST205',
  message: "Could not find the table 'public.profiles' in the schema cache",
};
stub.updateResult = { data: null, error: schemaError };
result = await profiles.updateProfile(user, { full_name: 'Ann Cruz', role: 'teacher' });
check('schema cache error detected', profiles.isMissingSchemaError(result.error));
check('schema cache error is actionable', /schema\.sql/.test(result.error?.message ?? ''));

stub.updateResult = { data: null, error: schemaError };
check('getProfile returns null on a schema error', (await profiles.getProfile('u1')) === null);
check(
  'permission errors are not reported as setup',
  profiles.isMissingSchemaError({ code: '42501', message: 'new row violates row-level security policy' }) === false
);

unlinkSync(stubPath);
unlinkSync(modulePath);

for (const { name, pass } of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
}

const failed = checks.filter((entry) => !entry.pass).length;
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll profile logic checks passed.');
process.exitCode = failed ? 1 : 0;
