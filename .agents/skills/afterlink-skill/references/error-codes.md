# AfterLink Error Codes

All errors in AfterLink extend the base `AfterLinkError` class from `@afterlink/core/errors`.

---

## Error Categories

| Code Range | Category | Error Classes |
|------------|----------|---------------|
| 100–109 | Protocol | `ProtocolError`, `FrameParseError`, `VersionMismatchError`, `InvalidFrameTypeError`, `PayloadTooLargeError`, `ChecksumError` |
| 110–119 | Serialization | `SerializationError`, `DeserializationError`, `InvalidMessagePackError` |
| 401–403 | Auth | `AuthError`, `InvalidTokenError`, `ExpiredTokenError`, `MissingTokenError`, `PermissionDeniedError` |
| 404–405 | Route | `RouteNotFoundError`, `MethodNotAllowedError` |
| 422 | Validation | `ValidationError` |
| 429 | Rate Limit | `RateLimitError` |
| 500–509 | Connection | `ConnectionError`, `ConnectionTimeoutError`, `ConnectionRefusedError`, `ConnectionResetError` |
| 510–519 | Server | `ServerError`, `HandlerError`, `StreamError`, `PublishError`, `SubscribeError` |
| 520–529 | TLS | `TLSError`, `CertificateError`, `HandshakeError` |

---

## Error Properties

Every `AfterLinkError` instance has:

| Property | Type | Description |
|----------|------|-------------|
| `code` | number | Numeric error code (e.g. 404) |
| `name` | string | Error class name (e.g. "RouteNotFoundError") |
| `message` | string | Human-readable error message |
| `details` | object \| null | Additional context (validation failures, etc.) |

---

## Usage Examples

### Catching and Inspecting Errors

```js
const { AfterLinkError, fromError, getErrorClassByCode } = require('@afterlink/core/errors');

try {
  await client.request('users.get', { id: '123' });
} catch (err) {
  if (err instanceof AfterLinkError) {
    console.log(`Error ${err.code}: ${err.name}`);
    console.log(err.message);
    if (err.details) {
      console.log('Details:', err.details);
    }
  }
}
```

### Converting Unknown Errors

```js
const { fromError } = require('@afterlink/core/errors');

try {
  // Some operation that might throw anything
} catch (err) {
  const alError = fromError(err);
  console.log(alError.code, alError.message);
}
```

### Looking Up Error Class by Code

```js
const { getErrorClassByCode } = require('@afterlink/core/errors');

const ErrorClass = getErrorClassByCode(404);
// Returns RouteNotFoundError
```

### Throwing Typed Errors in Handlers

```js
const { AuthError, ValidationError } = require('@afterlink/core/errors');
const { z } = require('zod');

server.on('user.create', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) throw new AuthError('Missing authorization header', 401);

  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid payload', 422, { errors: parsed.error.errors });
  }

  res.send({ id: crypto.randomUUID(), ...parsed.data });
});
```
