import { AuthError } from '@afterlink/core/errors';

const PUBLIC_ROUTES = new Set([
  'auth.register',
  'auth.login',
  '__health',
  '__health.live',
  '__health.ready',
  '__health.stats',
]);

export async function authMiddleware(req, next) {
  if (PUBLIC_ROUTES.has(req.route)) return next();

  const user = req.session?.user;
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }

  req.user = {
    id: user.sub || user.id,
    username: user.username,
    email: user.email,
  };

  return next();
}
