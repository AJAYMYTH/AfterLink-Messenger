import WebSocket from 'ws';
import { Frame, FrameTypes, Serializer } from '@afterlink/core';

const WS_URL = 'ws://localhost:4001/ws';
const ORIGIN = 'http://localhost:5173';

class TestClient {
  constructor(name) {
    this.name = name;
    this.ws = null;
    this._pending = new Map();
    this._msgId = 0;
    this._handshake = null;
    this.sessionId = null;
    this.user = null;
    this.token = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL, { origin: ORIGIN, headers: { Origin: ORIGIN } });
      this.ws.on('open', () => {
        this._doHandshake().then(resolve).catch(reject);
      });
      this.ws.on('message', (data) => {
        const buf = Buffer.from(data);
        const frame = Frame.decode(buf);
        if (!frame) return;
        this._handleFrame(frame);
      });
      this.ws.on('error', reject);
      this.ws.on('close', () => {});
    });
  }

  _nextId() { return (++this._msgId) >>> 0; }

  async _doHandshake() {
    return new Promise((resolve, reject) => {
      const id = this._nextId();
      const payload = Serializer.encode({
        version: 'AL/1.1', capabilities: ['streaming', 'pubsub'], auth: null
      });
      const timeout = setTimeout(() => reject(new Error('Handshake timeout')), 5000);
      this._pending.set(id, {
        resolve: (data) => { clearTimeout(timeout); this.sessionId = data.session_id; resolve(data); },
        reject,
      });
      this.ws.send(Frame.encode(FrameTypes.HELLO, 0, id, payload), { binary: true });
    });
  }

  _handleFrame(frame) {
    const { type, messageId, payload } = frame;
    if (type === FrameTypes.HELLO_ACK || type === FrameTypes.RESPONSE) {
      const data = Serializer.decode(payload);
      const pending = this._pending.get(messageId);
      if (pending) { this._pending.delete(messageId); pending.resolve(type === FrameTypes.HELLO_ACK ? data : (data.body || data)); }
    } else if (type === FrameTypes.ERROR) {
      const pending = this._pending.get(messageId);
      if (pending) { this._pending.delete(messageId); pending.reject(new Error(Serializer.decode(payload).message)); }
    }
  }

  async request(route, body) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('Not connected');
    const id = this._nextId();
    const payload = Serializer.encode({ route, body });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Request ${route} timeout`)), 10000);
      this._pending.set(id, {
        resolve: (data) => { clearTimeout(timeout); resolve(data); },
        reject: (err) => { clearTimeout(timeout); reject(err); },
      });
      this.ws.send(Frame.encode(FrameTypes.REQUEST, 0, id, payload), { binary: true });
    });
  }

  async register(username, email, password) {
    return this.request('auth.register', { username, email, password, displayName: username });
  }

  async login(email, password) {
    return this.request('auth.login', { email, password });
  }

  async logout() {
    return this.request('auth.logout', {});
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    testsFailed++;
  }
}

async function main() {
  console.log('\n=== AfterLink Messenger E2E Tests ===\n');

  const ts = Date.now();
  const user1Email = `user1_${ts}@test.com`;
  const user2Email = `user2_${ts}@test.com`;
  const password = 'test123456';

  // --- Auth Tests ---
  console.log('1. Auth Flow');
  const client1 = new TestClient('client1');
  await client1.connect();
  console.log('   Connected client1');

  let user1Data, user2Data;

  await test('Register user1', async () => {
    const res = await client1.register('user1_' + ts, user1Email, password);
    if (!res.ok) throw new Error(res.error);
    user1Data = res.data;
    client1.token = res.data.token;
    client1.user = res.data.user;
  });

  await test('Register user2', async () => {
    const c = new TestClient('client2');
    await c.connect();
    const res = await c.register('user2_' + ts, user2Email, password);
    if (!res.ok) throw new Error(res.error);
    user2Data = res.data;
    c.close();
  });

  await test('Login user1', async () => {
    const res = await client1.login(user1Email, password);
    if (!res.ok) throw new Error(res.error);
    if (!res.data.token) throw new Error('No token returned');
    client1.token = res.data.token;
    client1.user = res.data.user;
  });

  // Logout and reconnect with token
  await test('Logout', async () => {
    const res = await client1.logout();
    if (!res.ok) throw new Error(res.error);
  });

  // --- Room Tests ---
  console.log('\n2. Room Management');
  let roomId;

  await test('Create public room', async () => {
    const res = await client1.request('rooms.create', {
      name: 'Test Room ' + ts,
      type: 'public',
      description: 'A test room'
    });
    if (!res.ok) throw new Error(res.error);
    roomId = res.data.id;
    if (!roomId) throw new Error('No room ID returned');
  });

  await test('List rooms', async () => {
    const res = await client1.request('rooms.list', {});
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
    if (res.data.length === 0) throw new Error('No rooms returned');
    const found = res.data.find(r => r.id === roomId);
    if (!found) throw new Error('Created room not in list');
  });

  await test('Join room', async () => {
    const res = await client1.request('rooms.join', { roomId });
    if (!res.ok) throw new Error(res.error);
  });

  // --- Message Tests ---
  console.log('\n3. Messaging');

  let messageId;

  await test('Send message to room', async () => {
    const res = await client1.request('messages.send', {
      roomId,
      content: 'Hello from e2e test!',
    });
    if (!res.ok) throw new Error(res.error);
    messageId = res.messageId;
    if (!messageId) throw new Error('No messageId returned');
  });

  await test('Get message history', async () => {
    const res = await client1.request('messages.history', { roomId, limit: 10 });
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
    if (res.data.length === 0) throw new Error('No messages returned');
  });

  await test('React to message', async () => {
    const res = await client1.request('messages.react', {
      messageId,
      emoji: '👍',
      action: 'add'
    });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Send reply message', async () => {
    const res = await client1.request('messages.send', {
      roomId,
      content: 'This is a reply!',
      replyTo: messageId,
    });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Delete own message', async () => {
    // Send a message then delete it
    const msg = await client1.request('messages.send', {
      roomId, content: 'Will be deleted'
    });
    if (!msg.ok) throw new Error('Failed to create message for deletion');
    const del = await client1.request('messages.delete', { messageId: msg.messageId });
    if (!del.ok) throw new Error(del.error);
  });

  // --- DM Tests ---
  console.log('\n4. Direct Messages');

  await test('Send DM', async () => {
    const res = await client1.request('dm.send', {
      receiverId: user2Data.user.id,
      content: 'Hey from e2e test!'
    });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Get DM inbox', async () => {
    const res = await client1.request('dm.inbox', {});
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  await test('Get DM history', async () => {
    const res = await client1.request('dm.history', {
      otherUserId: user2Data.user.id,
      limit: 10
    });
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  // --- File Upload Tests ---
  console.log('\n5. File Upload');

  await test('Get upload URL for image', async () => {
    const res = await client1.request('files.upload', {
      fileName: 'test.png',
      contentType: 'image/png',
      fileSize: 1024,
    });
    if (!res.ok) throw new Error(res.error);
    if (!res.data.uploadUrl) throw new Error('No upload URL');
    if (!res.data.publicUrl) throw new Error('No public URL');
  });

  await test('Reject unsupported file type', async () => {
    const res = await client1.request('files.upload', {
      fileName: 'test.exe',
      contentType: 'application/x-msdownload',
      fileSize: 1024,
    });
    if (res.ok) throw new Error('Should have rejected unsupported type');
  });

  await test('Reject oversized file', async () => {
    const res = await client1.request('files.upload', {
      fileName: 'huge.bin',
      contentType: 'image/png',
      fileSize: 50 * 1024 * 1024,
    });
    if (res.ok) throw new Error('Should have rejected oversized file');
  });

  // --- User Tests ---
  console.log('\n6. User Features');

  await test('Get user profile', async () => {
    const res = await client1.request('users.profile', { userId: client1.user.id });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Search users', async () => {
    const res = await client1.request('users.search', { query: 'user1' });
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
  });

  await test('Update presence status', async () => {
    const res = await client1.request('presence.update', { status: 'away' });
    if (!res.ok) throw new Error(res.error);
  });

  // Cleanup
  client1.close();
  console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
