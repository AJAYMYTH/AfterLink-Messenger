# AfterLink API Reference

Full API documentation for `@afterlink/server` and `@afterlink/client`.

---

## Server Constructor Options

```js
new Server({
  port: 4000,                    // Port to listen on
  host: '0.0.0.0',              // Bind address
  maxConnections: 1000,          // Max concurrent connections
  idleTimeout: 30000,            // Close idle connections after (ms)
  auth: {                        // JWT authentication
    enabled: true,
    secret: process.env.JWT_SECRET,
    algorithm: 'HS256'
  },
  tls: {                         // TLS configuration
    enabled: false,
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  },
  compression: {                 // Payload compression
    enabled: true,
    threshold: 1024              // Compress payloads > 1KB
  },
  rateLimit: {                   // Rate limiting
    enabled: true,
    maxRequests: 100,
    windowMs: 60000
  },
  health: {                      // Health endpoints
    enabled: true,
    token: process.env.HEALTH_TOKEN,
    port: 4001,
    thresholds: {
      maxConnections: 1000,
      maxLatency: 100,
      maxErrorRate: 0.1
    }
  },
  browser: {                     // WebSocket bridge for browsers
    enabled: true,
    corsOrigins: ['http://localhost:3000']
  }
});
```

---

## Server Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `on` | `on(route: string, handler: async (req, res) => void, schema?: ZodSchema)` | Register a route handler |
| `use` | `use(middleware: async (req, next) => any)` | Add middleware |
| `publish` | `publish(topic: string, data: any)` | Broadcast to all subscribers of a topic |
| `listen` | `listen()` | Start the server |
| `close` | `close()` | Gracefully shut down the server |
| `getStats` | `getStats()` | Get connection and request statistics |

---

## Client Constructor Options

```js
new Client('afterlink://localhost:4000', {
  timeout: 5000,                 // Request timeout (ms)
  autoReconnect: true,           // Auto-reconnect on disconnect
  maxReconnectAttempts: 5,       // Max reconnection attempts
  reconnectDelay: 1000,          // Delay between reconnects (ms)
  pingInterval: 30000            // Keepalive ping interval (ms)
});
```

---

## Client Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `connect` | `connect()` | Establish connection to server |
| `request` | `request(route: string, body: any)` | Send a request and await response |
| `subscribe` | `subscribe(topic: string, callback: (msg) => void)` | Subscribe to a pub/sub topic |
| `publish` | `publish(topic: string, data: any)` | Publish a message to a topic |
| `stream` | `stream(route: string, body: any)` | Open a streaming connection |
| `disconnect` | `disconnect()` | Close the connection |

---

## Health Endpoint Paths

| Path | Method | Purpose |
|------|--------|---------|
| `/__health` | GET | Full health report with all checks |
| `/__health/live` | GET | Liveness probe — is the process running? |
| `/__health/ready` | GET | Readiness probe — can accept traffic? |
| `/__health/stats` | GET | Connection count, request rates, error rates |

All health endpoints return JSON. If a `token` is configured, pass it as `Authorization: Bearer <token>`.
