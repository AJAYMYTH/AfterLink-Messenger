import net from 'net';
import { Frame, FrameTypes, Serializer } from '@afterlink/core';

const HOST = '127.0.0.1';
const PORT = 4000;

class TcpTestClient {
  constructor() {
    this.socket = null;
    this._pending = new Map();
    this._msgId = 0;
    this.session = null;
    this._buffer = Buffer.alloc(0);
  }

  _nextId() { return (++this._msgId) >>> 0; }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.connect(PORT, HOST, async () => {
        try {
          const session = await this._handshake();
          this.session = session;
          resolve(session);
        } catch (err) {
          reject(err);
        }
      });
      this.socket.on('data', (data) => {
        this._buffer = Buffer.concat([this._buffer, data]);
        this._processBuffer();
      });
      this.socket.on('error', reject);
      this.socket.on('close', () => {});
    });
  }

  _processBuffer() {
    while (this._buffer.length >= 10) {
      const frame = Frame.decode(this._buffer);
      if (!frame) break;
      this._buffer = this._buffer.slice(frame.totalSize);
      this._handleFrame(frame);
    }
  }

  _handleFrame(frame) {
    const { type, messageId, payload } = frame;
    const pending = this._pending.get(messageId);
    if (!pending) return;

    if (type === FrameTypes.HELLO_ACK || type === FrameTypes.RESPONSE) {
      const data = Serializer.decode(payload);
      this._pending.delete(messageId);
      if (type === FrameTypes.HELLO_ACK) {
        pending.resolve(data);
      } else {
        pending.resolve(data.body || data);
      }
    } else if (type === FrameTypes.ERROR) {
      this._pending.delete(messageId);
      const err = Serializer.decode(payload);
      pending.reject(new Error(err.message || 'Unknown error'));
    }
  }

  async _handshake() {
    return new Promise((resolve, reject) => {
      const id = this._nextId();
      const payload = Serializer.encode({
        version: 'AL/1.1',
        capabilities: ['streaming', 'pubsub'],
        auth: null,
      });
      const timeout = setTimeout(() => reject(new Error('Handshake timeout')), 5000);
      this._pending.set(id, {
        resolve: (data) => { clearTimeout(timeout); resolve(data); },
        reject,
      });
      const frame = Frame.encode(FrameTypes.HELLO, 0, id, payload);
      this.socket.write(frame);
    });
  }

  async request(route, body = {}) {
    const id = this._nextId();
    const payload = Serializer.encode({ route, body });
    const frame = Frame.encode(FrameTypes.REQUEST, 0, id, payload);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Request ${route} timeout`)), 10000);
      this._pending.set(id, {
        resolve: (data) => { clearTimeout(timeout); resolve(data); },
        reject: (err) => { clearTimeout(timeout); reject(err); },
      });
      this.socket.write(frame);
    });
  }

  close() {
    if (this.socket) this.socket.destroy();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n=== AfterLink TCP E2E Tests ===\n');

  const ts = Date.now();
  const password = 'test123456';
  const user1Email = `tcp1_${ts}@test.com`;
  const user2Email = `tcp2_${ts}@test.com`;

  // --- 1. Auth ---
  console.log('1. Auth Flow');

  const c1 = new TcpTestClient();
  await c1.connect();
  console.log('   Connected to TCP server');

  let user1, user2;

  await test('Register user1', async () => {
    const res = await c1.request('auth.register', {
      username: `tcp1_${ts}`,
      email: user1Email,
      password,
      displayName: 'TCP User 1',
    });
    if (!res.ok) throw new Error(res.error);
    user1 = res.data;
  });

  await test('Register user2', async () => {
    const c2 = new TcpTestClient();
    await c2.connect();
    const res = await c2.request('auth.register', {
      username: `tcp2_${ts}`,
      email: user2Email,
      password,
      displayName: 'TCP User 2',
    });
    if (!res.ok) throw new Error(res.error);
    user2 = res.data;
    c2.close();
  });

  await test('Login user1', async () => {
    const res = await c1.request('auth.login', { email: user1Email, password });
    if (!res.ok) throw new Error(res.error);
    if (!res.data.token) throw new Error('No token returned');
  });

  await test('Login with wrong password', async () => {
    const res = await c1.request('auth.login', { email: user1Email, password: 'wrong' });
    if (res.ok) throw new Error('Should have failed');
  });

  // --- 2. Rooms ---
  console.log('\n2. Room Management');

  let roomId;

  await test('Create public room', async () => {
    const res = await c1.request('rooms.create', {
      name: `TCP Room ${ts}`,
      type: 'public',
      description: 'Created via TCP',
    });
    if (!res.ok) throw new Error(res.error);
    roomId = res.data.id;
  });

  await test('List rooms', async () => {
    const res = await c1.request('rooms.list', {});
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
    if (!res.data.find(r => r.id === roomId)) throw new Error('Room not in list');
  });

  await test('Join room', async () => {
    const res = await c1.request('rooms.join', { roomId });
    if (!res.ok) throw new Error(res.error);
  });

  // --- 3. Messages ---
  console.log('\n3. Messaging');

  let messageId;

  await test('Send message', async () => {
    const res = await c1.request('messages.send', {
      roomId,
      content: 'Hello from TCP test!',
    });
    if (!res.ok) throw new Error(res.error);
    messageId = res.messageId;
  });

  await test('Get message history', async () => {
    const res = await c1.request('messages.history', { roomId, limit: 10 });
    if (!res.ok) throw new Error(res.error);
    if (!Array.isArray(res.data)) throw new Error('Expected array');
    if (res.data.length === 0) throw new Error('No messages');
  });

  await test('React to message', async () => {
    const res = await c1.request('messages.react', {
      messageId, emoji: '👍', action: 'add',
    });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Reply to message', async () => {
    const res = await c1.request('messages.send', {
      roomId, content: 'Reply!', replyTo: messageId,
    });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Delete own message', async () => {
    const msg = await c1.request('messages.send', { roomId, content: 'to delete' });
    if (!msg.ok) throw new Error('Failed creating msg');
    const del = await c1.request('messages.delete', { messageId: msg.messageId });
    if (!del.ok) throw new Error(del.error);
  });

  // --- 4. Direct Messages ---
  console.log('\n4. Direct Messages');

  const userId2 = user2.user.id;

  await test('Send DM', async () => {
    const res = await c1.request('dm.send', {
      receiverId: userId2,
      content: 'Hey from TCP!',
    });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Get DM inbox', async () => {
    const res = await c1.request('dm.inbox', {});
    if (!res.ok) throw new Error(res.error);
  });

  await test('Get DM history', async () => {
    const res = await c1.request('dm.history', {
      otherUserId: userId2, limit: 10,
    });
    if (!res.ok) throw new Error(res.error);
  });

  // --- 5. Files ---
  console.log('\n5. File Upload');

  await test('Get upload URL', async () => {
    const res = await c1.request('files.upload', {
      fileName: 'photo.png',
      contentType: 'image/png',
      fileSize: 50000,
    });
    if (!res.ok) throw new Error(res.error);
    if (!res.data.uploadUrl) throw new Error('No upload URL');
  });

  await test('Reject unsupported type', async () => {
    const res = await c1.request('files.upload', {
      fileName: 'virus.exe',
      contentType: 'application/x-msdownload',
      fileSize: 1000,
    });
    if (res.ok) throw new Error('Should reject exe');
  });

  // --- 6. Users & Presence ---
  console.log('\n6. User Features');

  await test('Get user profile', async () => {
    const res = await c1.request('users.profile', { userId: user1.user.id });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Search users', async () => {
    const res = await c1.request('users.search', { query: 'tcp' });
    if (!res.ok) throw new Error(res.error);
  });

  await test('Update presence', async () => {
    const res = await c1.request('presence.update', { status: 'dnd' });
    if (!res.ok) throw new Error(res.error);
  });

  c1.close();
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
