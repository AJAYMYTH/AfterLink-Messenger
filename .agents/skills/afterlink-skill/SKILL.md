---
name: afterlink-skill
description: >
  Use this skill when working with AfterLink — a custom binary protocol for Node.js real-time
  communication. Trigger whenever the user mentions AfterLink, wants to replace WebSockets or HTTP
  with a faster protocol, needs pub/sub messaging, RPC between services, live data streaming,
  or real-time dashboards in Node.js. Also trigger for: scaffolding a new AfterLink server or
  client, integrating AfterLink into an existing project, debugging AfterLink errors, writing
  AfterLink route handlers or middleware, setting up TLS/JWT auth, browser WebSocket bridge,
  or writing tests for AfterLink routes. Even if the user just says "add real-time" or "live
  updates" in a Node.js project, consider this skill.
license: MIT
---

# AfterLink Agent Skill

AfterLink is a custom 10-byte binary protocol for Node.js. It replaces HTTP/WebSocket/gRPC with
a single protocol using MessagePack serialization.

**Key numbers:** 30,167 msg/sec · 0.033ms avg latency · 76% faster than WebSocket · Node.js 20+ required

---

## Decision: Should I Use AfterLink?

| ✅ Use AfterLink | ❌ Don't use AfterLink |
|-----------------|----------------------|
| Real-time dashboards | Simple REST APIs |
| Chat / messaging | File uploads |
| RPC between microservices | One-off HTTP requests |
| Live data streaming | Non-Node.js environments |
| Browser ↔ Server live updates | |

---

## Installation

```bash
npm install afterlink         # all packages (recommended)
# or individually:
npm install @afterlink/core @afterlink/server @afterlink/client @afterlink/browser @afterlink/cli
```

---

## Task Playbook

### 1. Scaffold a New Server + Client

**Server** (`server.js`):
```js
const { Server } = require('@afterlink/server');
const { z } = require('zod');

const server = new Server({ port: 4000 });

server.on('ping', async (req, res) => {
  res.send({ message: 'pong', ts: Date.now() });
});

server.on('user.create', async (req, res) => {
  const { name, email } = req.body;
  res.send({ id: crypto.randomUUID(), name, email });
}, z.object({ name: z.string().min(1), email: z.string().email() }));

server.listen();
```

**Client** (`client.js`):
```js
const { Client } = require('@afterlink/client');

const client = new Client('afterlink://localhost:4000');
await client.connect();

const result = await client.request('ping', {});
console.log(result);

await client.disconnect();
```

---

### 2. Pub/Sub Pattern

```js
// Server — broadcast on receive
server.on('chat.send', async (req, res) => {
  server.publish('chat', { user: req.body.user, text: req.body.text });
  res.send({ ok: true });
});

// Client — subscribe
client.subscribe('chat', (msg) => {
  console.log('New message:', msg);
});

// Client — publish
await client.publish('chat', { user: 'ajju', text: 'Hello!' });
```

> ⚠️ Message ordering is only guaranteed **within** the same topic.

---

### 3. Streaming Data

```js
// Server
server.on('logs.stream', async (req, res) => {
  const stream = res.stream();
  for (let i = 0; i < 10; i++) {
    stream.write({ line: `Log entry ${i}` });
    await new Promise(r => setTimeout(r, 100));
  }
  stream.end();
});

// Client
const stream = await client.stream('logs.stream', {});
stream.on('data', (chunk) => console.log(chunk));
stream.on('end', () => console.log('Done'));
```

---

### 4. Middleware (Auth + Logging)

```js
// JWT auth middleware
server.use(async (req, next) => {
  const token = req.headers.authorization;
  if (!token) throw new AuthError('Missing token', 401);
  req.user = verifyJWT(token);
  return next();
});

// Logging middleware
server.use(async (req, next) => {
  const start = Date.now();
  const result = await next();
  console.log(`${req.route} took ${Date.now() - start}ms`);
  return result;
});
```

---

### 5. TLS / Secure Connections

```js
const { Server, generateDevCerts } = require('@afterlink/server');

// Development (self-signed)
const certs = await generateDevCerts();
const server = new Server({ port: 4000, tls: { enabled: true, ...certs } });

// Production
const server = new Server({
  port: 4000,
  tls: {
    enabled: true,
    key: fs.readFileSync('/etc/ssl/private/key.pem'),
    cert: fs.readFileSync('/etc/ssl/certs/cert.pem')
  }
});

// Client uses afterlinks:// for TLS
const client = new Client('afterlinks://localhost:4000');
```

---

### 6. Browser WebSocket Bridge

```js
// Server — enable bridge
const server = new Server({
  port: 4000,
  browser: { enabled: true, corsOrigins: ['http://localhost:3000'] }
});

// Browser HTML
<script type="module">
  import { Client } from 'https://unpkg.com/@afterlink/browser/dist/client.esm.js';
  const client = new Client('ws://localhost:4000/__ws');
  await client.connect();
  const data = await client.request('ping', {});
</script>
```

---

### 7. Health Endpoint

```js
new Server({
  port: 4000,
  health: {
    enabled: true,
    token: process.env.HEALTH_TOKEN,  // optional Bearer auth
    port: 4001,                        // optional separate port
    thresholds: { maxConnections: 1000, maxLatency: 100, maxErrorRate: 0.1 }
  }
});
```

| Path | Purpose |
|------|---------|
| `/__health` | Full health report |
| `/__health/live` | Is process alive? |
| `/__health/ready` | Can accept traffic? |
| `/__health/stats` | Connection & request stats |

---

### 8. Rate Limiting + Compression

```js
new Server({
  port: 4000,
  compression: { enabled: true, threshold: 1024 }, // compress payloads > 1KB
  rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 }
});
```

---

### 9. Integrate Into Existing Project

1. `npm install afterlink`
2. Keep existing Express/HTTP for REST; add AfterLink server on a **different port** (e.g. 4000)
3. Move real-time routes (live updates, chat, notifications) to AfterLink handlers
4. Update clients to connect via `afterlink://` for those routes
5. Use the browser bridge (`/__ws`) for any frontend that can't use raw TCP

---

### 10. Writing Tests for AfterLink Routes

```js
const { Server } = require('@afterlink/server');
const { Client } = require('@afterlink/client');

let server, client;

beforeAll(async () => {
  server = new Server({ port: 5000 });
  server.on('add', async (req, res) => {
    res.send({ result: req.body.a + req.body.b });
  });
  server.listen();

  client = new Client('afterlink://localhost:5000');
  await client.connect();
});

afterAll(async () => {
  await client.disconnect();
  await server.close();
});

test('add route returns correct sum', async () => {
  const res = await client.request('add', { a: 2, b: 3 });
  expect(res.result).toBe(5);
});
```

---

## Error Handling Reference

All errors extend `AfterLinkError`. Key categories:

| Code Range | Category | Example |
|------------|----------|---------|
| 100–199 | Protocol | Frame parse error, version mismatch |
| 401–403 | Auth | Invalid/expired token, bad permissions |
| 404–405 | Route | Route not found |
| 422 | Validation | Zod schema failed |
| 429 | Rate Limit | Too many requests |
| 500–599 | Connection/Server | Timeout, handler crash |

```js
const { AfterLinkError, fromError, getErrorClassByCode } = require('@afterlink/core/errors');

try {
  await client.request('missing.route', {});
} catch (err) {
  if (err instanceof AfterLinkError) {
    console.log(err.code);    // e.g. 404
    console.log(err.name);    // e.g. "RouteError"
    console.log(err.details);
  }
}
```

See `references/error-codes.md` for all 29 error classes.

---

## Debugging with CLI

```bash
afterlink ping afterlink://localhost:4000
afterlink call afterlink://localhost:4000 user.create '{"name":"test","email":"test@example.com"}'
afterlink inspect afterlink://localhost:4000 --mode trace   # raw frame inspection
afterlink monitor afterlink://localhost:4000                # live dashboard
```

---

## Client Config Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 5000 | Request timeout in ms |
| `autoReconnect` | boolean | true | Auto-reconnect on disconnect |
| `maxReconnectAttempts` | number | 5 | Max reconnection attempts |
| `reconnectDelay` | number | 1000 | Delay between reconnects (ms) |
| `pingInterval` | number | 30000 | Keepalive ping interval (ms) |

See `references/api-reference.md` for full server and client API docs.

---

## TypeScript

All packages ship `.d.ts` definitions. Use `import` syntax:

```ts
import { Server } from '@afterlink/server';
import { z } from 'zod';

const server = new Server({ port: 4000 });
server.on('user.get', async (req, res) => {
  res.send({ id: req.body.id, name: 'Alice' });
}, z.object({ id: z.string() }));
```

---

## Common Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection refused | Check server is running; firewall not blocking port |
| JWT auth fails | Verify secret matches; check token expiry |
| Schema validation errors | Payload must match Zod schema; use `z.any()` for optional fields |
| ECONNRESET on Windows | Add inbound firewall rule for Node.js |
| High memory usage | Set `maxConnections`, enable `idleTimeout` |
| Pub/Sub out of order | Only guaranteed within same topic |

---

## Package Reference

| Package | Purpose |
|---------|---------|
| `@afterlink/core` | Frame codec, serializer, errors, types |
| `@afterlink/server` | TCP server, routing, middleware, pub/sub, health, ws-bridge |
| `@afterlink/client` | TCP client, auto-reconnect, subscriptions |
| `@afterlink/browser` | WebSocket transport for browsers |
| `@afterlink/cli` | CLI: ping, call, inspect, monitor |
| `afterlink` | Meta-package (installs all above) |

---

## Links
- npm: https://www.npmjs.com/package/afterlink
- GitHub: https://github.com/AJAYMYTH/AfterLink
- Docs: https://afterlinkdocs.vercel.app
