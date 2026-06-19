import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function verifyToken(token, secret) {
  const { jwtVerify } = await import('jose');
  return jwtVerify(token, new TextEncoder().encode(secret));
}

export function patchConnection() {
  const path = require('path');
  const ServerPath = require.resolve('@afterlink/server');
  const ServerDir = path.dirname(ServerPath);

  // Patch TCP Connection auth
  const Connection = require(path.join(ServerDir, 'Connection.js'));

  Connection.prototype._validateAuth = async function (token) {
    if (this.options.auth?.secret) {
      const result = await verifyToken(token, this.options.auth.secret);
      this._jwtPayload = result.payload;
      return result;
    }
    return null;
  };

  Connection.prototype._handleHandshake = async function (frame) {
    try {
      const { Serializer, FrameTypes } = require('@afterlink/core');
      const data = Serializer.decode(frame.payload);
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (this.options.auth && data.auth) {
        await this._validateAuth(data.auth);
      }

      const serverCompression = this.options.compression || {};
      const clientAlgorithm = data.compression || 'none';
      const serverEnabled = serverCompression.enabled !== false;
      const serverAlgorithm = serverCompression.algorithm || 'zlib';
      let agreedAlgorithm = 'none';
      if (serverEnabled && clientAlgorithm !== 'none') {
        if (clientAlgorithm === serverAlgorithm || clientAlgorithm === 'brotli') {
          agreedAlgorithm = clientAlgorithm;
        } else if (serverAlgorithm !== 'none') {
          agreedAlgorithm = serverAlgorithm;
        }
      }

      this._compression = {
        enabled: agreedAlgorithm !== 'none',
        algorithm: agreedAlgorithm,
        level: serverCompression.level ?? 6,
        threshold: serverCompression.threshold ?? 1024,
      };

      this.session = {
        id: sessionId,
        version: data.version || 'AL/1',
        capabilities: data.capabilities || [],
        connectedAt: new Date().toISOString(),
        remoteAddress: this.getRemoteAddress(),
        compression: agreedAlgorithm,
        user: this._jwtPayload || null,
      };

      const ackPayload = Serializer.encode({
        session_id: sessionId,
        server_version: 'AL/1.1',
        capabilities: ['streaming', 'pubsub', 'compression', 'rate-limit'],
        compression: agreedAlgorithm,
        rateLimit: this.options.rateLimit?.enabled
          ? { requestsPerSecond: this.options.rateLimit.requestsPerSecond, burstSize: this.options.rateLimit.burstSize }
          : undefined,
      });
      this.send(FrameTypes.HELLO_ACK, 0, frame.messageId, ackPayload);
    } catch (err) {
      const { errors } = require('@afterlink/core');
      if (err instanceof errors.AuthFailedError) {
        this.sendError(err.code, err.message);
      } else {
        this.sendError('AUTH_FAILED', err.message);
      }
      this.socket.destroy();
    }
  };

  // Patch WebSocket bridge
  const bridgeModule = require(path.join(ServerDir, 'browser', 'ws-bridge.js'));
  bridgeModule.createWsBridge = function (server, config) {
    const { port, path: wsPath = '/ws', cors = { origins: [] } } = config;
    const http = require('http');
    const { Frame, FrameTypes, Serializer } = require('@afterlink/core');
    const { WebSocketServer } = require('ws');

    const httpServer = http.createServer((req, res) => {
      if (req.url === wsPath) return;
      res.writeHead(404);
      res.end('Not Found');
    });

    const wss = new WebSocketServer({
      server: httpServer,
      path: wsPath,
      verifyClient: (info, cb) => {
        if (cors.origins === '*') return cb(true);
        const origin = info.req.headers.origin;
        if (!origin) return cb(false, 403, 'Forbidden');
        if (Array.isArray(cors.origins) && cors.origins.includes(origin)) return cb(true);
        cb(false, 403, 'Forbidden');
      },
    });

    wss.on('connection', (ws, req) => {
      const sessionId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const session = {
        id: sessionId,
        version: 'AL/1.1',
        capabilities: ['streaming', 'pubsub'],
        connectedAt: new Date().toISOString(),
        remoteAddress: req.socket.remoteAddress || 'unknown',
        compression: 'none',
        user: null,
      };

      let buffer = Buffer.alloc(0);
      let handshakeComplete = false;

      ws.on('message', async (data) => {
        if (!Buffer.isBuffer(data)) data = Buffer.from(data);

        if (!handshakeComplete) {
          try {
            const frame = Frame.decode(data);
            if (!frame || frame.type !== FrameTypes.HELLO) {
              ws.close(1008, 'Send HELLO frame first');
              return;
            }
            const helloData = Serializer.decode(frame.payload);
            session.version = helloData.version || 'AL/1.1';
            session.capabilities = helloData.capabilities || [];

            if (helloData.auth && server.config.auth?.secret) {
              const { jwtVerify } = await import('jose');
              const result = await jwtVerify(helloData.auth, new TextEncoder().encode(server.config.auth.secret));
              session.user = result.payload;
            }

            const ackPayload = Serializer.encode({
              session_id: session.id,
              server_version: 'AL/1.1',
              capabilities: ['streaming', 'pubsub', 'compression', 'rate-limit'],
              compression: 'none',
            });
            ws.send(Frame.encode(FrameTypes.HELLO_ACK, 0, frame.messageId, ackPayload), { binary: true });
            handshakeComplete = true;

            // Process any additional frames that arrived in the same chunk
            const remaining = data.slice(frame.totalSize);
            if (remaining.length > 0) {
              buffer = Buffer.concat([buffer, remaining]);
              while (buffer.length >= 10) {
                const nextFrame = Frame.decode(buffer);
                if (!nextFrame) break;
                buffer = buffer.slice(nextFrame.totalSize);
                handleWsFrame(nextFrame, ws, session, server);
              }
            }
          } catch (err) {
            ws.close(1008, err.message);
          }
          return;
        }

        buffer = Buffer.concat([buffer, data]);
        while (buffer.length >= 10) {
          const frame = Frame.decode(buffer);
          if (!frame) break;
          buffer = buffer.slice(frame.totalSize);
          handleWsFrame(frame, ws, session, server);
        }
      });

      ws.on('close', () => {
        server.router.onDisconnect({ session, isActive: () => false });
      });
      ws.on('error', (err) => {
        if (err.code !== 'ECONNRESET') console.error(`[AfterLink] WS ${sessionId} error:`, err.message);
      });
    });

    wss.on('error', (err) => {
      console.error('[AfterLink] WebSocket bridge error:', err.message);
    });

    httpServer.listen(port, server.config.host, () => {
      console.log(`[AfterLink] WebSocket bridge listening on ${server.config.host}:${port}${wsPath}`);
    });

    return httpServer;
  };

  function handleWsFrame(frame, ws, session, server) {
    const { Frame, FrameTypes, Serializer } = require('@afterlink/core');

    if (frame.type === FrameTypes.REQUEST) {
      let route, body;
      try {
        const decoded = Serializer.decode(frame.payload);
        route = decoded.route;
        body = decoded.body || {};
      } catch {
        const errPayload = Serializer.encode({ code: 'MALFORMED_PAYLOAD', message: 'Invalid request payload' });
        ws.send(Frame.encode(FrameTypes.ERROR, 0, frame.messageId, errPayload), { binary: true });
        return;
      }

      const routeConfig = server.router.routes.get(route);
      if (!routeConfig) {
        const errPayload = Serializer.encode({ code: 'ROUTE_NOT_FOUND', message: `Route '${route}' not found` });
        ws.send(Frame.encode(FrameTypes.ERROR, 0, frame.messageId, errPayload), { binary: true });
        return;
      }

      if (routeConfig.schema) {
        try {
          routeConfig.schema.parse(body);
        } catch (err) {
          const { ValidationError } = require('@afterlink/core/errors');
          const validationErr = ValidationError.fromZodError(err, { requestId: frame.messageId });
          ws.send(Frame.encode(FrameTypes.ERROR, 0, frame.messageId, Serializer.encode(validationErr.toJSON())), { binary: true });
          return;
        }
      }

      let responseSent = false;
      const req = { body, session, route, connection: { session, getRemoteAddress: () => session.remoteAddress } };
      const res = {
        send: (data) => {
          if (responseSent) return;
          responseSent = true;
          ws.send(Frame.encode(FrameTypes.RESPONSE, 0, frame.messageId, Serializer.encode({ status: 'ok', body: data })), { binary: true });
        },
        error: (code, message, details) => {
          if (responseSent) return;
          responseSent = true;
          ws.send(Frame.encode(FrameTypes.ERROR, 0, frame.messageId, Serializer.encode({ code, message, details })), { binary: true });
        },
      };

      server.router._runMiddlewares(req, async () => {
        await routeConfig.handler(req, res);
      }).catch((err) => {
        if (!responseSent) {
          ws.send(Frame.encode(FrameTypes.ERROR, 0, frame.messageId, Serializer.encode({ code: 'INTERNAL_SERVER_ERROR', message: err.message })), { binary: true });
        }
      });
    } else if (frame.type === FrameTypes.SUBSCRIBE) {
      let topic;
      try { topic = Serializer.decode(frame.payload).topic; } catch { return; }
      if (!topic || typeof topic !== 'string') return;
      const wsConn = { session, isActive: () => ws.readyState === 1, send: (type, flags, msgId, payload) => ws.send(Frame.encode(type, flags, msgId, payload), { binary: true }) };
      server.router.pubSubBroker.subscribe(topic, wsConn);
      ws.send(Frame.encode(FrameTypes.RESPONSE, 0, frame.messageId, Serializer.encode({ topic, sub_id: `s_${Date.now()}` })), { binary: true });
    } else if (frame.type === FrameTypes.UNSUBSCRIBE) {
      let topic;
      try { topic = Serializer.decode(frame.payload).topic; } catch { return; }
      const wsConn = { session, isActive: () => ws.readyState === 1, send: () => {} };
      server.router.pubSubBroker.unsubscribe(topic, wsConn);
    } else if (frame.type === FrameTypes.PUBLISH) {
      let topic, data;
      try { const d = Serializer.decode(frame.payload); topic = d.topic; data = d.data; } catch { return; }
      server.router.pubSubBroker.publish(topic, data);
    } else if (frame.type === FrameTypes.PING) {
      ws.send(Frame.encode(FrameTypes.PONG, 0, 0, Buffer.alloc(0)), { binary: true });
    }
  }
}
