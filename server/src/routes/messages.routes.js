import { z } from 'zod';
import supabase from '../db/supabase.js';

export function registerMessageRoutes(server) {
  server.on('messages.send', async (req, res) => {
    const { roomId, content, type, replyTo } = req.body;
    const senderId = req.user.id;

    const { data: member } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', senderId)
      .maybeSingle();

    if (!member) return res.send({ ok: false, error: 'Not a member of this room' });

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        type: type || 'text',
        reply_to: replyTo || null,
      })
      .select('*, sender:sender_id(id, username, display_name, avatar_url)')
      .single();

    if (error) return res.send({ ok: false, error: error.message });

    server.publish(`room:${roomId}`, { event: 'new_message', data: msg });

    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const { data: mentionedUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', match[1])
        .single();
      if (mentionedUser) {
        await supabase.from('notifications').insert({
          user_id: mentionedUser.id,
          type: 'mention',
          payload: { room_id: roomId, message_id: msg.id, from_user: senderId },
        });
        server.publish(`notify:${mentionedUser.id}`, {
          event: 'mention',
          roomId,
          messageId: msg.id,
          from: req.user.username,
          content: content.substring(0, 100),
        });
      }
    }

    res.send({ ok: true, messageId: msg.id });
  }, z.object({
    roomId: z.string().uuid(),
    content: z.string().min(1).max(4000),
    type: z.enum(['text', 'image', 'file']).default('text'),
    replyTo: z.string().uuid().optional(),
  }));

  server.on('messages.history', async (req, res) => {
    const { roomId, before, limit } = req.body;

    let query = supabase
      .from('messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_url), reactions(*)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit || 50);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) return res.send({ ok: false, error: error.message });

    res.send({ ok: true, data: (data || []).reverse() });
  }, z.object({
    roomId: z.string().uuid(),
    before: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }));

  server.on('messages.delete', async (req, res) => {
    const { messageId } = req.body;
    const userId = req.user.id;

    const { data: msg } = await supabase
      .from('messages')
      .select('id, room_id, sender_id')
      .eq('id', messageId)
      .single();

    if (!msg) return res.send({ ok: false, error: 'Message not found' });

    const { data: member } = await supabase
      .from('room_members')
      .select('role')
      .eq('room_id', msg.room_id)
      .eq('user_id', userId)
      .single();

    if (!member) return res.send({ ok: false, error: 'Not a member of this room' });
    if (msg.sender_id !== userId && member.role === 'member') {
      return res.send({ ok: false, error: 'Not authorized' });
    }

    await supabase.from('messages').delete().eq('id', messageId);

    server.publish(`room:${msg.room_id}`, {
      event: 'message_deleted',
      data: { id: messageId, roomId: msg.room_id },
    });

    res.send({ ok: true });
  }, z.object({ messageId: z.string().uuid() }));

  server.on('messages.react', async (req, res) => {
    const { messageId, emoji, action } = req.body;
    const userId = req.user.id;

    if (action === 'add') {
      const { data: existing } = await supabase
        .from('reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('reactions').insert({ message_id: messageId, user_id: userId, emoji });
      }
    } else {
      await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    }

    const { data: msg } = await supabase
      .from('messages')
      .select('room_id')
      .eq('id', messageId)
      .single();

    if (msg) {
      const { data: reactions } = await supabase
        .from('reactions')
        .select('*')
        .eq('message_id', messageId);

      server.publish(`room:${msg.room_id}`, {
        event: 'reaction_updated',
        data: { messageId, reactions: reactions || [] },
      });
    }

    res.send({ ok: true });
  }, z.object({
    messageId: z.string().uuid(),
    emoji: z.string().max(10),
    action: z.enum(['add', 'remove']).default('add'),
  }));
}
