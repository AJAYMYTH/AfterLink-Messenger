# AfterLink Protocol Specification

AfterLink uses a custom 10-byte binary frame header followed by a MessagePack-serialized payload.

---

## 10-Byte Frame Header Layout

| Bytes | Field | Size | Description |
|-------|-------|------|-------------|
| 1 | Frame Type | 1 byte | Identifies the type of frame (see table below) |
| 2 | Flags | 1 byte | Bitmask for frame options |
| 3–6 | Message ID | 4 bytes | Unique identifier for request/response correlation |
| 7–10 | Payload Length | 4 bytes | Length of the MessagePack payload in bytes (big-endian uint32) |

```
+-----------+-----------+-------------------+-------------------+
| Frame Type|   Flags   |    Message ID     |  Payload Length   |
|  1 byte   |  1 byte   |     4 bytes       |     4 bytes       |
+-----------+-----------+-------------------+-------------------+
```

---

## Frame Types

| Hex Code | Frame Name | Direction | Description |
|----------|------------|-----------|-------------|
| `0x01` | REQUEST | C → S | Client request to a route |
| `0x02` | RESPONSE | S → C | Server response to a request |
| `0x03` | ERROR | S → C | Error response |
| `0x04` | PUBLISH | C → S | Client publishes to a topic |
| `0x05` | SUBSCRIBE | C → S | Client subscribes to a topic |
| `0x06` | UNSUBSCRIBE | C → S | Client unsubscribes from a topic |
| `0x07` | BROADCAST | S → C | Server broadcasts to topic subscribers |
| `0x08` | PING | C → S / S → C | Keepalive ping |
| `0x09` | PONG | C → S / S → C | Keepalive pong |
| `0x0A` | STREAM | C → S | Open a stream |
| `0x0B` | STREAM_DATA | S → C | Stream chunk |
| `0x0C` | STREAM_END | S → C | Stream completed |
| `0x0D` | STREAM_ERROR | S → C | Stream error |
| `0x0E` | CLOSE | C → S / S → C | Connection close |
| `0x0F` | HEALTH | C → S | Health check request |
| `0x10` | WS_BRIDGE | C → S | WebSocket bridge frame |

---

## Flags Bitmask

| Bit | Name | Description |
|-----|------|-------------|
| 0 | Compression | Payload is compressed with zlib/deflate |
| 1 | Encrypted | Payload is encrypted (AES-256-GCM) |
| 2–7 | Reserved | Reserved for future use |

```
Flag byte: 0b00000001 = compressed
           0b00000010 = encrypted
           0b00000011 = compressed + encrypted
```

---

## Payload Format

- All payloads are **MessagePack** serialized binary data
- The `Payload Length` field specifies the exact byte count of the MessagePack data following the header
- MessagePack is used for its compact binary representation and fast serialization/deserialization

### Request Payload Structure

```msgpack
{
  "route": "string",     // Route name (e.g. "user.create")
  "body": any,           // Request body (any serializable value)
  "headers": { ... }     // Optional headers map
}
```

### Response Payload Structure

```msgpack
{
  "data": any,           // Response data
  "status": number       // Optional status code
}
```

### Error Payload Structure

```msgpack
{
  "code": number,        // Error code (e.g. 404)
  "name": string,        // Error class name
  "message": string,     // Human-readable message
  "details": any         // Optional additional context
}
```
