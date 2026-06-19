import { z } from 'zod';
import supabase from '../db/supabase.js';

export function registerUserRoutes(server) {
  server.on('users.profile', async (req, res) => {
    const { userId } = req.body;
    const targetId = userId || req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, display_name, avatar_url, status, bio, created_at')
      .eq('id', targetId)
      .single();

    if (error) return res.send({ ok: false, error: 'User not found' });
    res.send({ ok: true, data: user });
  }, z.object({ userId: z.string().uuid().optional() }));

  server.on('users.update', async (req, res) => {
    const updates = {};
    if (req.body.displayName !== undefined) updates.display_name = req.body.displayName;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.avatarUrl !== undefined) updates.avatar_url = req.body.avatarUrl;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, username, email, display_name, avatar_url, status, bio, created_at')
      .single();

    if (error) return res.send({ ok: false, error: error.message });
    res.send({ ok: true, data });
  }, z.object({
    displayName: z.string().max(50).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
  }));

  server.on('users.search', async (req, res) => {
    const { query } = req.body;

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, status')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    if (error) return res.send({ ok: false, error: error.message });
    res.send({ ok: true, data: data || [] });
  }, z.object({ query: z.string().min(1).max(100) }));
}
