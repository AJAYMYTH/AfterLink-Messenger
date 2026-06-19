import { z } from 'zod';
import supabase from '../db/supabase.js';

export function registerDMRoutes(server) {
  server.on('dm.send', async (req, res) => {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    const { data: dm, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: senderId, receiver_id: receiverId, content })
      .select('*, sender:sender_id(id, username, display_name, avatar_url)')
      .single();

    if (error) return res.send({ ok: false, error: error.message });

    server.publish(`dm:${receiverId}`, { event: 'new_dm', data: dm });
    server.publish(`dm:${senderId}`, { event: 'new_dm', data: dm });

    await supabase.from('notifications').insert({
      user_id: receiverId,
      type: 'dm',
      payload: { from_user: senderId, dm_id: dm.id, content: content.substring(0, 100) },
    });
    server.publish(`notify:${receiverId}`, {
      event: 'dm',
      from: req.user.username,
      content: content.substring(0, 100),
    });

    res.send({ ok: true, data: dm });
  }, z.object({
    receiverId: z.string().uuid(),
    content: z.string().min(1).max(4000),
  }));

  server.on('dm.history', async (req, res) => {
    const { otherUserId, before, limit } = req.body;
    const userId = req.user.id;

    let query = supabase
      .from('direct_messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_url)')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(limit || 50);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) return res.send({ ok: false, error: error.message });

    if (data && data.length > 0) {
      const unreadIds = data
        .filter(m => m.receiver_id === userId && !m.read_at)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    }

    res.send({ ok: true, data: (data || []).reverse() });
  }, z.object({
    otherUserId: z.string().uuid(),
    before: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }));

  server.on('dm.inbox', async (req, res) => {
    const userId = req.user.id;

    const { data: sent } = await supabase
      .from('direct_messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_url), receiver:receiver_id(id, username, display_name, avatar_url)')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('direct_messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_url), receiver:receiver_id(id, username, display_name, avatar_url)')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    const all = [...(sent || []), ...(received || [])];
    const latestPerUser = new Map();
    for (const msg of all) {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!latestPerUser.has(otherId) || new Date(msg.created_at) > new Date(latestPerUser.get(otherId).created_at)) {
        latestPerUser.set(otherId, msg);
      }
    }

    const { data: unreadCounts } = await supabase
      .from('direct_messages')
      .select('sender_id, count')
      .eq('receiver_id', userId)
      .is('read_at', null);

    const unreadMap = {};
    if (unreadCounts) {
      for (const u of unreadCounts) {
        unreadMap[u.sender_id] = parseInt(u.count);
      }
    }

    res.send({
      ok: true,
      data: Array.from(latestPerUser.values()).map(msg => {
        const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
        return {
          user: otherUser,
          lastMessage: msg,
          unread: unreadMap[msg.sender_id] || 0,
        };
      }),
    });
  }, null);
}
