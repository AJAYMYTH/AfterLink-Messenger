import 'dotenv/config';

export default {
  port: parseInt(process.env.AFTERLINK_PORT || '4000', 10),
  host: process.env.AFTERLINK_HOST || '0.0.0.0',
  maxConnections: parseInt(process.env.AFTERLINK_MAX_CONNECTIONS || '1000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    algorithm: 'HS256',
    expiresIn: '7d',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
};
