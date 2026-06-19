# AfterLink SDK Problems & Workarounds

## 1. `workspace:*` Protocol in Package Dependencies

**Problem:** `@afterlink/*` packages use `workspace:*` protocol internally. Running `npm install` throws `ERR! EUNSUPPORTEDPROTOCOL`.

**Fix:** Use `pnpm` instead of `npm`. Add `pnpm.overrides` in `package.json` to resolve workspace references:
```json
"pnpm": {
  "overrides": {
    "@afterlink/core": "1.2.0",
    "@afterlink/server": "1.2.0",
    "@afterlink/browser": "1.2.0"
  }
}
```

## 2. `jose` v6 is ESM-only — Crashes in CJS Context

**Problem:** The SDK's internal auth uses `jose` for JWT verification. `jose` v6 is ESM-only. When imported via CJS `require()`, it throws `ReferenceError: TextEncoder is not defined`.

**Fix:** Use dynamic `import()` in CJS files. In patched `Connection.js`:
```js
const { jwtVerify } = await import('jose');
```

## 3. Built-in `_handleHandshake` Doesn't Store JWT User in Session

**Problem:** The SDK's `Connection._handleHandshake` calls `_validateAuth()` but **discards the decoded JWT payload**. The `session.user` is always `null`, making every authenticated route throw `"Authentication required"`.

**Fix:** Patch `Connection._handleHandshake` to store `this._jwtPayload` on the session:
```js
this.session = {
  ...,
  user: this._jwtPayload || null,
};
```

## 4. Built-in `_validateAuth` Doesn't Use `await`

**Problem:** The SDK v1.2.0's `Connection._handleHandshake` calls `_validateAuth` without `await`, so the JWT verification completes asynchronously after the session is created. The session always has `user: null` regardless of whether the token was valid.

**Fix:** In the patched `_handleHandshake`, call `await this._validateAuth(data.auth)` before constructing `this.session`.

## 5. `ws-bridge` Doesn't Handle HELLO Auth or Pass `session.user` to Router

**Problem:** The SDK's built-in `createWsBridge`:
- Ignores the `auth` field in the HELLO frame entirely (creates session with `user: null`)
- Doesn't pass `req.session` to the router's middleware chain
- Routes receive no user context, so all authenticated routes fail

**Fix:** Rewrite `createWsBridge` entirely (see `patch-connection.js`):
- Parse HELLO auth via `jwtVerify`
- Set `session.user` from decoded JWT
- Create `req.session` and pass it to `handleWsFrame`
- Forward `session` to middleware chain

## 6. `ws-bridge` Drops Frames When HELLO and REQUEST Arrive in Same TCP Packet

**Problem:** When the browser sends HELLO and the first REQUEST as two `ws.send()` calls in quick succession, they can arrive as a single WebSocket message (one `ws.on('message')` event). The bridge decodes only the HELLO frame and returns, discarding the REQUEST frame still in the buffer.

**Fix:** After processing the HELLO, check for remaining data in the buffer:
```js
const remaining = data.slice(frame.totalSize);
if (remaining.length > 0) {
  buffer = Buffer.concat([buffer, remaining]);
  // process remaining frames
}
```

## 7. API Reference Documents Outdated API Names

**Problem:** The afterlink-skill's `api-reference.md` describes `rateLimit.maxRequests`, `browser.corsOrigins`, `auth.enabled`, etc. The actual v1.2.0 SDK uses:
- `rateLimit: { requestsPerSecond, burstSize }` (not `maxRequests`)
- `browser: { cors: { origins } }` (not `corsOrigins`)
- `auth: { type: 'jwt', secret }` (not `auth: { enabled: true }`)

**Fix:** Cross-reference against the actual `Server.js` source in `node_modules/@afterlink/server/src/` rather than relying solely on the skill docs.

## 8. `@afterlink/core` Exports No Client Class

**Problem:** The core package exports only `{ Frame, FrameTypes, Serializer, compression, errors }`. There is no `Client` class for TCP connections. Testing the TCP server requires writing a raw socket client using `net` module + Frame encoding.

**Fix:** Build a custom TCP test client using `net.Socket` and the low-level `Frame.encode`/`Frame.decode` utilities.

## 9. WebSocket CORS Blocks Node.js Test Clients

**Problem:** The ws-bridge's `verifyClient` requires an `Origin` header matching the allowed origins list. Node.js test scripts using `ws` library don't set this header by default, causing 403 rejection.

**Fix:** Set origin explicitly in test:
```js
new WebSocket(url, { origin: 'http://localhost:5173' });
```

## 10. Supabase `room_members!inner(role)` Join Fails in PostgREST

**Problem:** Using Supabase's `select('*, room_members!inner(role)')` with an inner join on room_members causes "Message not found" errors because PostgREST doesn't interpret the column restriction in joins the same way as raw SQL.

**Fix:** Use two separate queries instead:
```js
const msg = await supabase.from('messages').select('id,room_id,sender_id').eq('id',messageId).single();
const member = await supabase.from('room_members').select('role').eq('room_id',msg.room_id).eq('user_id',userId).single();
```

## 11. Supabase Mock Falls Back Silently

**Problem:** When `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` contain placeholder values, the server's `supabase.js` module creates a mock client (all queries return empty/null results). No error is thrown, making it appear the server works while silently dropping all data operations.

**Fix:** The mock is useful for development bootstrapping but must be replaced with real Supabase credentials before testing any data flow.
