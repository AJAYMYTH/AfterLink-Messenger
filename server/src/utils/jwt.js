import jwt from 'jsonwebtoken';
import config from '../config.js';

export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    algorithm: config.jwt.algorithm,
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    algorithms: [config.jwt.algorithm],
  });
}
