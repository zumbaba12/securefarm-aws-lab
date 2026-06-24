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

before(async () => {
  db = makeTestDb();
  seedDatabase(db);
  app = createApp(db);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
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
