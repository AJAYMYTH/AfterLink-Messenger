const WebSocket = require('ws');
const { Frame, FrameTypes, Serializer } = require('@afterlink/core');

const WS_URL = 'ws://localhost:4001/ws';
const ORIGIN = 'http://localhost:5173';

class WsTestClient {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this._pending = new Map();
    this._msgId = 0;
    this.sessionId = null;
    this._buffer = Buffer.alloc(0);
    this._handshakeDone = false;
  }

  _nextId() { return (++this._msgId) >>> 0; }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL, { origin: ORIGIN, headers: { Origin: ORIGIN } });
      this.ws.on('open', () => this._doHandshake().then(resolve).catch(reject));
      this.ws.on('message', (data) => {
        const buf = Buffer.from(data);
        this._buffer = Buffer.concat([this._buffer, buf]);
        this._processBuffer();
      });
      this.ws.on('error', reject);
    });
  }

  _processBuffer() {
    while (this._buffer.length >= 10) {
      const frame = Frame.decode(this._buffer);
      if (!frame) break;
      this._buffer = this._buffer.slice(frame.totalSize);

      const { type, messageId, payload } = frame;
      const pending = this._pending.get(messageId);
      if (!pending) continue;

      if (type === FrameTypes.HELLO_ACK || type === FrameTypes.RESPONSE) {
        this._pending.delete(messageId);
        const data = Serializer.decode(payload);
        pending.resolve(type === FrameTypes.HELLO_ACK ? data : (data.body || data));
      } else if (type === FrameTypes.ERROR) {
        this._pending.delete(messageId);
        const err = Serializer.decode(payload);
        pending.reject(new Error(err.message || 'Unknown error'));
      }
    }
  }

  async _doHandshake() {
    return new Promise((resolve, reject) => {
      const id = this._nextId();
      const payload = Serializer.encode({
        version: 'AL/1.1',
        capabilities: ['streaming', 'pubsub'],
        auth: this.token,
      });
      const timeout = setTimeout(() => reject(new Error('Handshake timeout')), 5000);
      this._pending.set(id, {
        resolve: (data) => { clearTimeout(timeout); this.sessionId = data.session_id; this._handshakeDone = true; resolve(data); },
        reject,
      });
      this.ws.send(Frame.encode(FrameTypes.HELLO, 0, id, payload), { binary: true });
    });
  }

  async request(route, body = {}) {
    const id = this._nextId();
    const payload = Serializer.encode({ route, body });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Request ${route} timeout`)), 10000);
      this._pending.set(id, { resolve: (data) => { clearTimeout(timeout); resolve(data); }, reject: (err) => { clearTimeout(timeout); reject(err); } });
      this.ws.send(Frame.encode(FrameTypes.REQUEST, 0, id, payload), { binary: true });
    });
  }

  close() { if (this.ws) this.ws.close(); }
}

async function main() {
  const ts = Date.now();
  const email = `wsuser_${ts}@test.com`;

  // Register
  const anon = new WsTestClient();
  await anon.connect();
  const reg = await anon.request('auth.register', {
    username: 'wsuser_' + ts, email, password: 'test123456', displayName: 'WS User',
  });
  if (!reg.ok) { console.error('Register failed:', reg.error); process.exit(1); }
  console.log('Registered:', reg.data.user.username);

  const login = await anon.request('auth.login', { email, password: 'test123456' });
  if (!login.ok) { console.error('Login failed:', login.error); process.exit(1); }
  const token = login.data.token;
  anon.close();
  console.log('Got token');

  // Reconnect with token (like browser after login)
  const authed = new WsTestClient(token);
  await authed.connect();
  console.log('Reconnected with JWT');

  // Search
  const search = await authed.request('users.search', { query: 'wsuser' });
  if (!search.ok) { console.error('Search failed:', search.error); process.exit(1); }
  console.log('Search results:', search.data.length, 'users');

  if (search.data.length < 2) {
    // Register a second user
    const anon2 = new WsTestClient();
    await anon2.connect();
    const reg2 = await anon2.request('auth.register', {
      username: 'wsuser2_' + ts, email: `wsuser2_${ts}@test.com`, password: 'test123456', displayName: 'WS User 2',
    });
    if (!reg2.ok) { console.error('Register user2 failed:', reg2.error); process.exit(1); }
    anon2.close();
    console.log('Registered user2');
  }

  // Re-search
  const search2 = await authed.request('users.search', { query: 'wsuser' });
  if (!search2.ok) { console.error('Search 2 failed:', search2.error); process.exit(1); }
  console.log('Search results after 2nd user:', search2.data.length, 'users');
  const otherUser = search2.data.find(u => u.id !== login.data.user.id);

  // Send DM
  const dm = await authed.request('dm.send', { receiverId: otherUser.id, content: 'Hello via WS!' });
  if (!dm.ok) { console.error('DM failed:', dm.error); process.exit(1); }
  console.log('DM sent successfully');

  // Get DM inbox
  const inbox = await authed.request('dm.inbox', {});
  if (!inbox.ok) { console.error('Inbox failed:', inbox.error); process.exit(1); }
  console.log('Inbox has', inbox.data.length, 'conversations');

  console.log('\nAll WS-bridge tests passed!');
  authed.close();
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
