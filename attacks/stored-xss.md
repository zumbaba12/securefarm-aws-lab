# Stored XSS — Plot Notes

## Target

- Storage: `POST /api/plots` (and `POST /api/plots/:id/seasons`) — `notes` field
  stored verbatim, no sanitization.
- Sink: **Plot detail** page (`app/client/src/pages/PlotDetail.jsx`), which
  renders plot notes with `dangerouslySetInnerHTML`, marked
  `LAB_VULNERABILITY (stored-xss)`.

## Why it exists

Notes are persisted exactly as submitted and then injected into the DOM as raw
HTML:

```jsx
<div
  className="notes-body"
  dangerouslySetInnerHTML={{ __html: plot.notes || '<em>No notes.</em>' }}
/>
```

Normally React escapes interpolated strings; `dangerouslySetInnerHTML` opts out,
so any markup in the notes executes in the victim's browser when the detail page
loads.

## Safe local proof-of-concept

Run against your **local** instance only.

1. Log in as the demo user.
2. Go to **Plots → Add plot** (or edit a season). In the **Notes** field, enter:

   ```html
   <img src=x onerror="alert('xss-lab')">
   ```

3. Save, then open that plot's detail page. The `onerror` handler fires and the
   alert pops — proving stored, persistent execution for anyone who views the
   plot.

A non-alert, lower-noise variant that just mutates the page:

```html
<b style="color:red">XSS-LAB-MARKER</b>
```

### cURL to store the payload

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:4000/api/login \
  -H 'content-type: application/json' \
  -d '{"email":"farmer@securefarm.local","password":"password123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s -X POST http://127.0.0.1:4000/api/plots \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"XSS Test Plot","notes":"<img src=x onerror=\"alert(1)\">"}'
```

Then visit `/plots/<id>` in the browser.

## Expected detection signal (AWS phase)

- AWS WAF XSS managed rule matches on request bodies containing `<script>`,
  `onerror=`, etc. (once an ALB + WAF front the app).
- Application logs showing HTML/JS markup in `notes` fields.
- Content-Security-Policy violation reports (after a CSP is added in the fix
  phase).

## Eventual fix

- Treat notes as plain text: render with normal JSX interpolation (React escapes
  it) instead of `dangerouslySetInnerHTML`.
- If rich text is genuinely needed, sanitize with a library such as DOMPurify on
  output and validate on input.
- Add a restrictive `Content-Security-Policy` response header.
