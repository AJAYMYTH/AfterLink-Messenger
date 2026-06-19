**AfterLink**

**MESSENGER**

_Product Requirements Document_

| **Project**    | AfterLink Messenger                      |
| -------------- | ---------------------------------------- |
| **Protocol**   | AfterLink v1.0.0 (binary, 10-byte frame) |
| **Version**    | PRD v1.0                                 |
| **Author**     | Ajju (Javali Ajayakumar)                 |
| **Date**       | May 2026                                 |
| **Status**     | Draft - Ready for Development            |
| **Repository** | github.com/AJAYMYTH/AfterLink            |

# **1\. Executive Summary**

AfterLink Messenger is a full-featured, real-time messaging application built exclusively on the AfterLink binary communication protocol - a custom application-layer protocol created by Ajju (Javali Ajayakumar) that delivers 76% lower latency than WebSocket, 30,167+ messages/second throughput, and a 10-byte frame overhead.

Unlike mainstream chat applications that rely on HTTP polling or WebSocket wrappers, AfterLink Messenger showcases the full capabilities of the AfterLink protocol: persistent TCP connections, built-in pub/sub messaging, Zod-based schema validation, JWT authentication, TLS encryption, and browser-compatible WebSocket bridging.

This document defines the complete product requirements for building AfterLink Messenger as a portfolio-grade, production-ready application that demonstrates the AfterLink protocol's advantages in a compelling real-world use case.

| **Goal**              | **Description**                                              |
| --------------------- | ------------------------------------------------------------ |
| Protocol Showcase     | Demonstrate every AfterLink feature in a real application    |
| Portfolio Project     | A production-grade app for Upwork / freelance client demos   |
| Open Source Reference | Provide the community with an AfterLink usage example        |
| Performance Benchmark | Prove AfterLink's speed vs WebSocket in a real chat workload |

# **2\. Product Overview**

## **2.1 Product Vision**

"The fastest messaging app you have ever built - because it runs on a protocol you designed."

AfterLink Messenger will be a modern, full-stack chat application with rooms, direct messages, file sharing, and real-time presence - all transported over the AfterLink binary protocol. The app will run on Node.js (server) and React/Vite (browser via AfterLink's WebSocket bridge).

## **2.2 Target Users**

- Developers evaluating AfterLink for their own projects
- Freelance clients looking for a real-time communication backend
- Tech recruiters and hackathon judges reviewing Ajju's portfolio
- Open-source contributors to the AfterLink ecosystem

## **2.3 Core Value Proposition**

| **Feature**       | **AfterLink Messenger**   | **Typical Chat App**   |
| ----------------- | ------------------------- | ---------------------- |
| Transport         | AfterLink binary protocol | HTTP + WebSocket       |
| Header overhead   | 10 bytes                  | 200-800 bytes (HTTP)   |
| Avg latency       | < 1ms (LAN)               | 5-50ms (HTTP)          |
| Schema validation | Built-in (Zod)            | Manual / none          |
| Auth              | JWT built-in              | Bolt-on                |
| Pub/Sub           | Native in protocol        | Separate broker needed |
| Reconnect         | Auto (built-in client)    | Custom logic needed    |

# **3\. Technology Stack**

## **3.1 Backend**

| **Layer**     | **Technology**             | **Purpose**                                |
| ------------- | -------------------------- | ------------------------------------------ |
| Protocol      | afterlink (npm)            | Core communication - ALL real-time traffic |
| Runtime       | Node.js 20+                | Required by AfterLink protocol             |
| Server SDK    | @afterlink/server          | TCP server, routing, pub/sub, middleware   |
| Validation    | Zod (built into AfterLink) | Schema validation on all routes            |
| Auth          | JWT (jsonwebtoken)         | User authentication via AfterLink headers  |
| Database      | Supabase (PostgreSQL)      | Message history, users, rooms storage      |
| File storage  | Supabase Storage           | Image and file attachments                 |
| TLS           | @afterlink/server TLS      | Encrypted connections in production        |
| Health        | AfterLink health endpoints | Monitoring via /\_\_health                 |
| Rate limiting | AfterLink built-in         | Prevent message spam                       |

## **3.2 Frontend**

| **Layer**       | **Technology**     | **Purpose**                             |
| --------------- | ------------------ | --------------------------------------- |
| Framework       | React 18 + Vite    | Fast SPA development                    |
| Protocol client | @afterlink/browser | WebSocket bridge to AfterLink server    |
| Styling         | Tailwind CSS       | Utility-first UI styling                |
| State           | Zustand            | Lightweight global state management     |
| UI Components   | shadcn/ui          | Accessible, styled component primitives |
| Icons           | lucide-react       | Consistent icon set                     |
| Notifications   | React Hot Toast    | Message delivery feedback               |

# **4\. System Architecture**

## **4.1 High-Level Architecture**

AfterLink Messenger uses a single-protocol architecture where all client-server communication flows through the AfterLink binary protocol. The browser client connects via the AfterLink WebSocket bridge; native Node.js services connect via raw TCP.

## **4.2 AfterLink Server Configuration**

const server = new Server({

port: 4000,

browser: { enabled: true, corsOrigins: \['<https://messenger.domain.com'\>] },

tls: { enabled: true, key: TLS_KEY, cert: TLS_CERT },

auth: { type: 'jwt', secret: process.env.JWT_SECRET },

rateLimit: { enabled: true, maxRequests: 200, windowMs: 60000 },

compression: { enabled: true, threshold: 1024 },

health: { enabled: true, port: 4001 }

});

## **4.3 AfterLink Routes**

| **Route**        | **Type**          | **Description**                             |
| ---------------- | ----------------- | ------------------------------------------- |
| auth.register    | REQUEST           | Register new user, return JWT               |
| auth.login       | REQUEST           | Validate credentials, return JWT + session  |
| auth.logout      | REQUEST           | Invalidate session token                    |
| rooms.list       | REQUEST           | Get all public rooms + user's private rooms |
| rooms.create     | REQUEST           | Create public or private room               |
| rooms.join       | REQUEST           | Join a room, subscribe to its topic         |
| rooms.leave      | REQUEST           | Leave room, unsubscribe                     |
| messages.send    | REQUEST + PUBLISH | Send message, broadcast to room topic       |
| messages.history | REQUEST           | Fetch paginated message history             |
| messages.delete  | REQUEST + PUBLISH | Delete message, broadcast deletion event    |
| messages.react   | REQUEST + PUBLISH | Add/remove emoji reaction                   |
| dm.send          | REQUEST + PUBLISH | Send direct message to user topic           |
| dm.history       | REQUEST           | Fetch DM history between two users          |
| presence.online  | PUBLISH           | Broadcast user online status                |
| presence.typing  | PUBLISH           | Broadcast typing indicator                  |
| files.upload     | REQUEST           | Get Supabase signed upload URL              |
| users.profile    | REQUEST           | Get/update user profile                     |
| users.search     | REQUEST           | Search users by username                    |

## **4.4 Pub/Sub Topics**

| **Topic Pattern** | **Subscribed Events**                                   |
| ----------------- | ------------------------------------------------------- |
| room:{roomId}     | New messages, reactions, member joins/leaves, deletions |
| dm:{userId}       | Private messages, read receipts                         |
| presence:{roomId} | Online/offline status, typing indicators                |
| notify:{userId}   | Mentions, room invites, system alerts                   |

# **5\. Feature Requirements**

## **5.1 Authentication & User Management**

### **5.1.1 Registration & Login**

- Email + password registration with Zod schema validation on the AfterLink route
- JWT token issued on login, attached to all subsequent AfterLink requests via req.headers.authorization
- Auto-reconnect on token refresh using AfterLink's built-in reconnect with updated auth
- Username uniqueness enforced at Supabase level and validated before response
- Password hashing via bcrypt (server-side, never transmitted after registration)

### **5.1.2 User Profiles**

- Avatar image upload via Supabase Storage (signed URL obtained through files.upload route)
- Display name, bio, and status (online/away/do not disturb)
- Profile update broadcast to presence topic for connected contacts

## **5.2 Rooms (Group Chat)**

### **5.2.1 Room Management**

- Create public rooms (discoverable) or private rooms (invite only)
- Room admin roles: owner, admin, member
- Invite users to private rooms via users.search + rooms.invite route
- Room settings: name, topic/description, avatar, member limit
- Owners can delete rooms, admins can kick/ban members

### **5.2.2 Room Messaging**

- Real-time message delivery via server.publish('room:{roomId}', msg)
- Message threading (reply to a specific message)
- Rich text formatting: bold, italic, code blocks, links
- Emoji reactions with live reaction count updates via pub/sub
- Message deletion (sender or admin) broadcast to all room subscribers
- @mention support with notification delivery to notify:{userId} topic
- #channel linking between rooms

## **5.3 Direct Messaging**

- One-to-one DM via dm:{userId} private topic
- DM inbox listing all active conversations sorted by last message time
- Read receipts: delivered and seen indicators
- Typing indicators via presence.typing broadcast
- DM message history with infinite scroll (paginated via messages.history route)

## **5.4 Real-Time Presence**

### **5.4.1 Online Status**

- User online/offline detection via AfterLink connection lifecycle events (connect/disconnect)
- Custom status: Online, Away, Do Not Disturb, Invisible
- Status broadcast to all room presence topics the user belongs to

### **5.4.2 Typing Indicators**

- Debounced typing events published to presence:{roomId} or dm:{userId}
- "User is typing..." shown to all room members in real time
- Auto-clears after 3 seconds of inactivity

## **5.5 File & Media Sharing**

- Image preview inline in chat (thumbnails stored in Supabase Storage)
- File attachments (PDF, ZIP, etc.) with file type icons and download links
- Upload flow: client calls files.upload route → gets signed Supabase URL → uploads directly → sends message with attachment URL
- Max file size: 10 MB per file
- Supported formats: JPEG, PNG, GIF, WebP, PDF, TXT, ZIP

## **5.6 Notifications**

- In-app notifications delivered via notify:{userId} pub/sub topic
- Browser push notifications (Web Push API) for mentions when tab is not focused
- Notification types: mention, DM, room invite, reaction on own message
- Notification badge count on room/DM list sidebar

## **5.7 Performance Dashboard (Dev Mode)**

⚡ This feature showcases AfterLink's speed advantage - a key differentiator for portfolio demos.

- Live metrics panel (toggle in dev mode) showing:
  - Messages per second (rolling 5-second window)
  - Average round-trip latency per request
  - Active AfterLink connections
  - Pub/Sub topic subscription counts
  - Error rate (AfterLink error codes 4xx/5xx)
- Data sourced from AfterLink health endpoint (/\_\_health/stats) polled every second

# **6\. Database Schema (Supabase / PostgreSQL)**

## **6.1 Tables**

| **Table**       | **Key Columns**                                             | **Notes**                                         |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| users           | id, username, email, avatar_url, status                     | Auth managed by JWT; Supabase stores profile data |
| rooms           | id, name, type, owner_id, created_at                        | type: 'public' \| 'private'                       |
| room_members    | room_id, user_id, role, joined_at                           | Roles: owner, admin, member                       |
| messages        | id, room_id, sender_id, content, type, reply_to, created_at | type: text, image, file, system                   |
| reactions       | message_id, user_id, emoji, created_at                      | Composite PK prevents duplicate reactions         |
| direct_messages | id, sender_id, receiver_id, content, read_at                | Indexed on sender+receiver for history queries    |
| notifications   | id, user_id, type, payload, read_at                         | Delivered via AfterLink pub/sub, persisted here   |

# **7\. AfterLink API Contract**

## **7.1 Sample Route Implementations**

### **7.1.1 messages.send**

server.on('messages.send', async (req, res) => {

const { roomId, content, type, replyTo } = req.body;

const senderId = req.user.id; // set by JWT middleware

const msg = await supabase.from('messages').insert({

room_id: roomId, sender_id: senderId,

content, type, reply_to: replyTo

}).select().single();

// Broadcast to all room subscribers

server.publish(\`room:\${roomId}\`, { event: 'new_message', data: msg.data });

res.send({ ok: true, messageId: msg.data.id });

}, z.object({

roomId: z.string().uuid(),

content: z.string().min(1).max(4000),

type: z.enum(\['text', 'image', 'file'\]).default('text'),

replyTo: z.string().uuid().optional()

}));

### **7.1.2 presence.typing**

server.on('presence.typing', async (req, res) => {

const { roomId } = req.body;

server.publish(\`presence:\${roomId}\`, {

event: 'typing',

userId: req.user.id,

username: req.user.username

});

res.send({ ok: true });

}, z.object({ roomId: z.string().uuid() }));

### **7.1.3 Browser Client Connection**

import { Client } from '@afterlink/browser';

const client = new Client('wss://api.messenger.com/\_\_ws', {

autoReconnect: true,

maxReconnectAttempts: 10,

reconnectDelay: 1000

});

await client.connect();

// Subscribe to room

await client.subscribe(\`room:\${roomId}\`, (event) => {

if (event.event === 'new_message') addMessage(event.data);

if (event.event === 'message_deleted') removeMessage(event.data.id);

});

# **8\. UI / UX Requirements**

## **8.1 Layout**

- Three-panel layout: sidebar (rooms/DMs), main chat area, member panel (collapsible)
- Sidebar: room list with unread badge, DM list, user avatar and status
- Top bar: room name, member count, search icon, settings icon
- Message area: infinite scroll, date separators, message grouping by sender
- Input bar: text input, emoji picker, file upload, send button

## **8.2 Design System**

| **Element**      | **Value**     | **Usage**                     |
| ---------------- | ------------- | ----------------------------- |
| Primary colour   | #E94560       | Buttons, accent, active state |
| Background dark  | #1A1A2E       | Sidebar, panel backgrounds    |
| Background light | #16213E       | Section headers               |
| Surface          | #FFFFFF       | Message bubbles, cards        |
| Font             | Inter / Arial | All UI text                   |
| Radius           | 8px           | Cards, message bubbles        |

## **8.3 Responsive Behaviour**

- Desktop (> 1024px): full three-panel layout
- Tablet (768px-1024px): sidebar + chat, member panel hidden
- Mobile (< 768px): single panel with bottom navigation bar

# **9\. Security Requirements**

| **Threat**               | **Mitigation**                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Unauthenticated access   | JWT middleware on all AfterLink routes; connection rejected on invalid/expired token        |
| Man-in-the-middle        | TLS via @afterlink/server TLS config; afterlinks:// in production                           |
| Message injection        | Zod schema validation built into every AfterLink route handler                              |
| Spam / flood             | AfterLink built-in rate limiter: 200 requests/min per client                                |
| XSS in messages          | Content sanitised via DOMPurify on the React client before render                           |
| Unauthorised room access | Room membership checked in handler before broadcast                                         |
| Brute-force login        | Rate limit on auth.login route + exponential back-off on failed attempts                    |
| Supply chain             | AfterLink's supply-chain-safe design: minimal deps, locked versions, no postinstall scripts |

# **10\. Performance Targets**

| **Metric**                     | **Target** | **AfterLink Baseline**     |
| ------------------------------ | ---------- | -------------------------- |
| Message delivery latency (LAN) | < 5ms p95  | < 1ms (protocol)           |
| Messages per second (server)   | \> 10,000  | 30,167 (protocol)          |
| Concurrent connections         | \> 1,000   | 10,000 (config limit)      |
| Message history load           | < 300ms    | Supabase query + AfterLink |
| Reconnection time              | < 2s       | Auto-reconnect built-in    |
| Memory per idle connection     | < 100KB    | < 50KB (protocol)          |
| UI frame rate                  | 60fps      | React + Zustand            |

# **11\. Development Phases**

## **Phase 1 - Foundation (Week 1-2)**

- Project scaffold: Node.js backend + React/Vite frontend
- AfterLink server setup with TLS, JWT middleware, rate limiting, health endpoint
- Supabase project init: users, rooms, messages tables
- auth.register and auth.login routes with Zod validation
- Browser client connection via @afterlink/browser WebSocket bridge

## **Phase 2 - Core Messaging (Week 3-4)**

- Rooms CRUD routes: rooms.list, rooms.create, rooms.join, rooms.leave
- messages.send route with pub/sub broadcast to room:{roomId}
- messages.history paginated fetch
- React chat UI: sidebar, message list, input bar
- Real-time message rendering via client.subscribe

## **Phase 3 - DMs & Presence (Week 5)**

- dm.send and dm.history routes
- presence.online and presence.typing pub/sub
- Typing indicator UI (debounced)
- Online status badges in sidebar

## **Phase 4 - Enhancements (Week 6)**

- Emoji reactions: messages.react route + live reaction count updates
- Message threading (reply-to UI)
- File upload integration with Supabase Storage
- In-app notifications via notify:{userId} topic
- @mention detection and notification delivery

## **Phase 5 - Polish & Portfolio (Week 7-8)**

- Performance dashboard (dev mode)
- Mobile responsive layout
- Dark mode with AfterLink brand colours
- README and demo video for GitHub + Upwork portfolio
- Deployment to Railway (AfterLink server) + Vercel (React frontend)
- AfterLink CLI monitor demo (afterlink monitor afterlinks://production-url)

# **12\. Deployment Architecture**

## **12.1 Infrastructure**

| **Component**     | **Platform**          | **Configuration**                                       |
| ----------------- | --------------------- | ------------------------------------------------------- |
| AfterLink Server  | Railway               | Node.js 20, port 4000, TLS enabled, PM2 process manager |
| React Frontend    | Vercel                | Vite build, connects to afterlinks:// server URL        |
| Database          | Supabase (free tier)  | PostgreSQL, Row Level Security enabled                  |
| File Storage      | Supabase Storage      | Public bucket for avatars, private for attachments      |
| Health monitoring | AfterLink /\_\_health | Uptime Robot pings /\_\_health/live every 60s           |

## **12.2 Environment Variables**

\# Server

AFTERLINK_PORT=4000

AFTERLINK_HOST=0.0.0.0

AFTERLINK_JWT_SECRET=&lt;strong-secret&gt;

AFTERLINK_MAX_CONNECTIONS=1000

SUPABASE_URL=<https://xxxx.supabase.co>

SUPABASE_SERVICE_KEY=&lt;service-role-key&gt;

NODE_ENV=production

\# Client (Vite)

VITE_AFTERLINK_URL=wss://afterlink-messenger.up.railway.app/\_\_ws

# **13\. Testing Strategy**

| **Test Type**     | **Tool**                                 | **Coverage**                                                                      |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| Unit tests        | Vitest                                   | AfterLink route handlers, Zod schemas, utility functions                          |
| Integration tests | AfterLink Test Client                    | Server ↔ client request/response cycle for each route                             |
| Pub/Sub tests     | AfterLink Test Client (multi-connection) | Message broadcast to multiple subscribers                                         |
| E2E tests         | Playwright                               | Browser ↔ AfterLink WebSocket bridge: send message, receive in second browser tab |
| Load tests        | autocannon + afterlink-client            | Throughput vs AfterLink's 30,167 msg/sec baseline                                 |
| Security tests    | Manual + OWASP ZAP                       | JWT bypass, XSS payloads, auth boundary checks                                    |

# **14\. Success Metrics**

| **Metric**                      | **Target**        | **Measurement**               |
| ------------------------------- | ----------------- | ----------------------------- |
| Message delivery latency        | < 5ms p95         | Performance dashboard         |
| All AfterLink routes functional | 100%              | Integration test suite passes |
| Reconnect after drop            | < 2 seconds       | Manual disconnect test        |
| Concurrent users (demo)         | \> 50 connections | Load test script              |
| GitHub stars on AfterLink       | +5 after demo     | GitHub analytics              |
| Upwork portfolio views          | \> 20 views/week  | Upwork analytics              |
| Mobile usable (LCP)             | < 2.5s            | Lighthouse mobile score       |

# **15\. Risks & Mitigations**

| **Risk**                   | **Severity** | **Mitigation**                                                                |
| -------------------------- | ------------ | ----------------------------------------------------------------------------- |
| Browser TCP limitation     | High         | AfterLink browser package uses WebSocket bridge (/\_\_ws) - already supported |
| Supabase free tier limits  | Medium       | Message pagination keeps DB load low; upgrade path is clear                   |
| TLS certificate expiry     | Medium       | Use Let's Encrypt auto-renew on Railway                                       |
| AfterLink pub/sub ordering | Low          | Ordering guaranteed per topic; use sequence numbers for critical ordering     |
| Windows ECONNRESET (dev)   | Low          | Add Node.js inbound firewall rule; documented in AfterLink troubleshooting    |

# **16\. Glossary**

| **Term**         | **Definition**                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------- |
| AfterLink        | Custom binary application-layer protocol built by Ajju; 10-byte frame, MessagePack serialized |
| Route            | Named AfterLink handler (e.g. messages.send) analogous to an HTTP endpoint                    |
| Pub/Sub          | Publish/Subscribe pattern; server.publish() broadcasts to all topic subscribers               |
| WebSocket Bridge | AfterLink server feature (/\_\_ws) that lets browsers connect using WebSocket                 |
| JWT              | JSON Web Token used for AfterLink connection authentication                                   |
| Zod              | TypeScript-first schema validation library used by AfterLink for request validation           |
| Presence         | Real-time user status (online/typing) broadcast via AfterLink pub/sub                         |
| DXA              | Office Open XML unit: 1440 DXA = 1 inch; used for DOCX layout measurements                    |

# **Appendix: AfterLink Messenger at a Glance**

AfterLink Messenger is not just a chat application - it is a live proof-of-concept that the AfterLink protocol works, scales, and is developer-friendly. Every message sent, every typing indicator shown, and every reconnect handled silently is evidence that AfterLink is production-ready.

Protocol reference: <https://afterlinkdocs.vercel.app>

GitHub: <https://github.com/AJAYMYTH/AfterLink>