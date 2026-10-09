const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { seedDemo } = require('./seed-demo.cjs');

function database(fail = false) {
  let state = { users: [], services: [], slots: [], rules: [] };
  return {
    get state() { return state; },
    async $transaction(action) {
      const draft = structuredClone(state);
      await action({
        user: {
          findUnique: async ({ where }) => draft.users.find(u => u.email === where.email),
          create: async ({ data }) => { draft.users.push(data); return data; },
        },
        service: {
          findFirst: async ({ where }) => draft.services.find(s => s.name === where.name),
          create: async ({ data }) => { const s = { ...data, id: String(draft.services.length) }; draft.services.push(s); return s; },
        },
        timeSlot: { upsert: async ({ create }) => {
          if (fail) throw new Error('simulated database failure');
          const existing = draft.slots.find(s => s.serviceId === create.serviceId && +s.startAt === +create.startAt);
          if (!existing) draft.slots.push(create);
        } },
        businessRule: {
          findFirst: async ({ where }) => draft.rules.find(r => r.title === where.title),
          create: async ({ data }) => draft.rules.push(data),
        },
      });
      state = draft;
    },
  };
}

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookingmate-seed-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  return path.join(dir, 'credentials.json');
}

test('credential collision preserves file and creates no database records', async t => {
  const file = fixture(t); fs.writeFileSync(file, 'existing credentials');
  const db = database();
  await assert.rejects(seedDemo(db, file), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(file, 'utf8'), 'existing credentials');
  assert.equal(db.state.users.length, 0);
});

test('unwritable/missing credential directory creates no users', async t => {
  const file = path.join(fixture(t), 'missing', 'credentials.json');
  const db = database();
  await assert.rejects(seedDemo(db, file), { code: 'ENOENT' });
  assert.equal(db.state.users.length, 0);
});

test('database failure rolls back accounts and removes only newly created credentials', async t => {
  const file = fixture(t); const db = database(true);
  await assert.rejects(seedDemo(db, file));
  assert.equal(db.state.users.length, 0);
  assert.equal(fs.existsSync(file), false);
});

test('initialization and rerun preserve passwords, records and credential file', async t => {
  const file = fixture(t); const db = database(); const now = new Date('2026-10-09T23:59:59Z');
  await seedDemo(db, file, now);
  const first = structuredClone(db.state); const privateFile = fs.readFileSync(file, 'utf8');
  assert.equal(first.users.length, 2);
  assert.equal(first.slots.length, 14);
  assert.ok(first.slots.every(s => s.startAt > now));
  assert.deepEqual(first.users.map(u => u.role), ['ADMIN', 'CUSTOMER']);
  await seedDemo(db, file, now);
  assert.deepEqual(db.state, first);
  assert.equal(fs.readFileSync(file, 'utf8'), privateFile);
});

test('partial existing accounts cannot overwrite credential file or alter existing role', async t => {
  const file = fixture(t); const db = database();
  db.state.users.push({ email: 'admin@bookingmate.example', role: 'CUSTOMER', passwordHash: 'existing' });
  fs.writeFileSync(file, 'preserve');
  await assert.rejects(seedDemo(db, file), { code: 'EEXIST' });
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.users[0].role, 'CUSTOMER');
});
