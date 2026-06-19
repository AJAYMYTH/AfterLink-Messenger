import 'dotenv/config';
import { Server } from '@afterlink/server';
import { patchConnection } from './utils/patch-connection.js';
import { authMiddleware } from './middleware/auth.js';
import { loggerMiddleware } from './middleware/logger.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerRoomRoutes } from './routes/rooms.routes.js';
import { registerMessageRoutes } from './routes/messages.routes.js';
import { registerDMRoutes } from './routes/dm.routes.js';
import { registerPresenceRoutes } from './routes/presence.routes.js';
import { registerFileRoutes } from './routes/files.routes.js';
import { registerUserRoutes } from './routes/users.routes.js';

patchConnection();

const PORT = parseInt(process.env.AFTERLINK_PORT || '4000', 10);

const server = new Server({
  port: PORT,
  host: process.env.AFTERLINK_HOST || '0.0.0.0',
  maxConnections: parseInt(process.env.AFTERLINK_MAX_CONNECTIONS || '1000', 10),
  auth: { type: 'jwt', secret: process.env.JWT_SECRET || 'dev-secret' },
  compression: { enabled: true, threshold: 1024 },
  rateLimit: { enabled: true, requestsPerSecond: 200, burstSize: 400 },
  health: { enabled: true },
  browser: {
    enabled: true,
    port: 4001,
    cors: { origins: ['http://localhost:5173', 'http://localhost:3000', 'https://afterlink-messenger.vercel.app'] },
  },
});

server.use(loggerMiddleware);
server.use(authMiddleware);

registerAuthRoutes(server);
registerRoomRoutes(server);
registerMessageRoutes(server);
registerDMRoutes(server);
registerPresenceRoutes(server);
registerFileRoutes(server);
registerUserRoutes(server);

server.listen();
server.handleProcessSignals();

console.log(`AfterLink Messenger server running on port ${PORT}`);
console.log(`WebSocket bridge on port 4001`);
