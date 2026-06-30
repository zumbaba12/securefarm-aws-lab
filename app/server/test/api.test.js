import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { seedDatabase } from '../src/seedData.js';
import { DEMO_CREDENTIALS } from '../src/config.js';

let app;
let baseUrl;
let server;
let db;

// In-memory stub for S3 so the suite never needs real AWS credentials.
const s3Calls = { put: [], remove: [] };
const stubStorage = {
  async put(args) { s3Calls.put.push(args); },
  async remove(args) { s3Calls.remove.push(args); },
};

before(async () => {
  db = makeTestDb();
  seedDatabase(db);
  app = createApp(db, { storage: stubStorage });
  await new Promise((resolve, reject) => {
    // Fail fast if the listener can't bind (e.g. a sandbox that denies TCP
    // listen) instead of hanging until the test runner times out.
    server = app.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
    server.once('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

async function api(path, options = {}) {
  const res = await fetch(baseUrl + path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function loginToken() {
  const { body } = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify(DEMO_CREDENTIALS),
  });
  return body.token;
}

test('login succeeds with seeded demo credentials', async () => {
  const { status, body } = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify(DEMO_CREDENTIALS),
  });
  assert.equal(status, 200);
  assert.ok(body.token);
  assert.equal(body.user.email, DEMO_CREDENTIALS.email);
});

test('login gives a verbose enumeration error for unknown email (intentional)', async () => {
  const { status, body } = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'nobody@example.com', password: 'x' }),
  });
  assert.equal(status, 401);
  assert.match(body.error, /No account found/);
});

test('protected routes reject missing auth', async () => {
  const { status } = await api('/api/dashboard');
  assert.equal(status, 401);
});

test('dashboard returns counts after login', async () => {
  const token = await loginToken();
  const { status, body } = await api('/api/dashboard', {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(status, 200);
  assert.ok(body.plotCount >= 1);
  assert.ok(body.activeSeasonCount >= 1);
});

test('plots can be created and listed', async () => {
  const token = await loginToken();
  const headers = { authorization: `Bearer ${token}` };
  const created = await api('/api/plots', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Test Plot', crop_type: 'Barley' }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.plot.name, 'Test Plot');

  const list = await api('/api/plots', { headers });
  assert.equal(list.status, 200);
  assert.ok(list.body.plots.some((p) => p.name === 'Test Plot'));
});

test('seasons can be created for a plot', async () => {
  const token = await loginToken();
  const headers = { authorization: `Bearer ${token}` };
  const detail = await api('/api/plots/1', { headers });
  const plotId = detail.body.plot.id;
  const created = await api(`/api/plots/${plotId}/seasons`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ season_name: 'Test Season', crop_type: 'Maize' }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.season.season_name, 'Test Season');
});

// --- Plot uploads --------------------------------------------------------
async function uploadFile(plotId, { token, filename, type, content }) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), filename);
  const res = await fetch(`${baseUrl}/api/plots/${plotId}/uploads`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

test('upload metadata routes require auth', async () => {
  const list = await api('/api/plots/1/uploads');
  assert.equal(list.status, 401);
});

test('a user cannot list uploads for a plot they do not own', async () => {
  // Create a second user with their own plot.
  const otherUser = db
    .prepare("INSERT INTO users (name, email, password) VALUES ('Other', 'other@securefarm.local', 'x')")
    .run();
  const otherPlot = db
    .prepare('INSERT INTO plots (user_id, name) VALUES (?, ?)')
    .run(otherUser.lastInsertRowid, 'Not Yours');

  const token = await loginToken();
  const { status } = await api(`/api/plots/${otherPlot.lastInsertRowid}/uploads`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(status, 404);
});

test('a user cannot upload to a plot they do not own', async () => {
  const otherUser = db
    .prepare("INSERT INTO users (name, email, password) VALUES ('Other2', 'other2@securefarm.local', 'x')")
    .run();
  const otherPlot = db
    .prepare('INSERT INTO plots (user_id, name) VALUES (?, ?)')
    .run(otherUser.lastInsertRowid, 'Not Yours 2');

  const token = await loginToken();
  const { status } = await uploadFile(otherPlot.lastInsertRowid, {
    token,
    filename: 'note.txt',
    type: 'text/plain',
    content: 'hello',
  });
  assert.equal(status, 404);
});

test('disallowed file types are rejected', async () => {
  const token = await loginToken();
  const { status } = await uploadFile(1, {
    token,
    filename: 'evil.html',
    type: 'text/html',
    content: '<script>alert(1)</script>',
  });
  assert.equal(status, 415);
});

test('oversized files are rejected', async () => {
  const token = await loginToken();
  // One byte over the 5 MiB default limit.
  const big = 'a'.repeat(5 * 1024 * 1024 + 1);
  const { status } = await uploadFile(1, {
    token,
    filename: 'big.txt',
    type: 'text/plain',
    content: big,
  });
  assert.equal(status, 413);
});

test('a successful upload stores metadata and a server-side S3 key', async () => {
  const before = s3Calls.put.length;
  const token = await loginToken();
  const { status, body } = await uploadFile(1, {
    token,
    filename: 'My Notes!.txt',
    type: 'text/plain',
    content: 'field observations',
  });
  assert.equal(status, 201);
  assert.equal(body.upload.original_name, 'My Notes!.txt');
  // Key is generated server-side under the configured prefix; the raw filename
  // is sanitized (no spaces or '!').
  assert.match(body.upload.s3_key, /^plot-uploads\/user-\d+\/plot-1\/[0-9a-f-]+-My_Notes_.txt$/);
  assert.equal(s3Calls.put.length, before + 1);

  // The new row is listable for the owner.
  const list = await api('/api/plots/1/uploads', {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(list.status, 200);
  assert.ok(list.body.uploads.some((u) => u.id === body.upload.id));
});

test('a successful S3 put is cleaned up when metadata persistence fails', async () => {
  // Isolated app whose metadata insert is guaranteed to fail (the table is
  // dropped) so we can prove the orphaned object is removed from S3.
  const db2 = makeTestDb();
  seedDatabase(db2);
  db2.exec('DROP TABLE plot_uploads');

  const calls = { put: [], remove: [] };
  const failStorage = {
    async put(args) { calls.put.push(args); },
    async remove(args) { calls.remove.push(args); },
  };
  const app2 = createApp(db2, { storage: failStorage });
  const server2 = await new Promise((resolve, reject) => {
    const s = app2.listen(0, '127.0.0.1', () => {
      s.removeListener('error', reject);
      resolve(s);
    });
    s.once('error', reject);
  });

  try {
    const { port } = server2.address();
    const base = `http://127.0.0.1:${port}`;
    const loginRes = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(DEMO_CREDENTIALS),
    });
    const { token } = await loginRes.json();

    const form = new FormData();
    form.append('file', new Blob(['field notes'], { type: 'text/plain' }), 'notes.txt');
    const res = await fetch(`${base}/api/plots/1/uploads`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json().catch(() => null);

    // The object was put, metadata persistence failed, so a generic failure is
    // returned and the just-uploaded object is removed to avoid an orphan.
    assert.equal(res.status, 500);
    assert.equal(calls.put.length, 1);
    assert.equal(calls.remove.length, 1);
    assert.equal(calls.remove[0].bucket, calls.put[0].bucket);
    assert.equal(calls.remove[0].key, calls.put[0].key);
    // No AWS/SQLite internals leak to the client.
    assert.doesNotMatch(body.error, /table|sqlite|SQL|bucket|aws/i);
  } finally {
    server2.closeAllConnections?.();
    await new Promise((resolve) => server2.close(resolve));
    db2.close();
  }
});

// Confirms the intentional SQL injection is actually reachable, so the lab
// exercise in attacks/sql-injection.md stays valid.
test('LAB: plot search is injectable via the search parameter', async () => {
  const token = await loginToken();
  const headers = { authorization: `Bearer ${token}` };
  // This payload closes the LIKE clause and forces a always-true predicate.
  const payload = encodeURIComponent("' OR '1'='1");
  const { status, body } = await api(`/api/plots?search=${payload}`, { headers });
  assert.equal(status, 200);
  // Injection returns all of the user's plots regardless of the search text.
  assert.ok(body.plots.length >= 3);
});
