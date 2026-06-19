import { z } from 'zod';
import supabase from '../db/supabase.js';
import { signToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';

export function registerAuthRoutes(server) {
  server.on('auth.register', async (req, res) => {
    const { username, email, password, displayName } = req.body;

    const existing = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existing.data) {
      return res.send({ ok: false, error: 'Username or email already taken' });
    }

    const hashed = await hashPassword(password);
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: hashed,
        display_name: displayName || username,
        status: 'online',
      })
      .select('id, username, email, display_name, avatar_url, status, created_at')
      .single();

    if (error) {
      return res.send({ ok: false, error: error.message });
    }

    const token = signToken({ id: user.id, username: user.username });
    res.send({ ok: true, data: { user, token } });
  }, z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    password: z.string().min(6).max(128),
    displayName: z.string().max(50).optional(),
  }));

  server.on('auth.login', async (req, res) => {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.send({ ok: false, error: 'Invalid email or password' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.send({ ok: false, error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, username: user.username });

    delete user.password_hash;
    res.send({
      ok: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          status: user.status,
          created_at: user.created_at,
        },
        token,
      },
    });
  }, z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }));

  server.on('auth.logout', async (req, res) => {
    await supabase
      .from('users')
      .update({ status: 'offline' })
      .eq('id', req.user.id);
    res.send({ ok: true });
  }, null);
}
