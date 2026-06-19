export async function loggerMiddleware(req, next) {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] → ${req.route}`);
  const result = await next();
  const ms = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ← ${req.route} (${ms}ms)`);
  return result;
}
