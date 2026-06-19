import { z } from 'zod';
import supabase from '../db/supabase.js';

export function registerRoomRoutes(server) {
  server.on('rooms.list', async (req, res) => {
    const userId = req.user.id;

    const { data: publicRooms } = await supabase
      .from('rooms')
      .select('*, room_members!inner(user_id)')
      .or('type.eq.public,and(type.eq.private,room_members.user_id.eq.' + userId + ')');

    const { data: ownedRooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('owner_id', userId);

    const roomIds = [...new Set([...(publicRooms || []), ...(ownedRooms || [])].map(r => r.id))];

    const { data: unreadCounts } = await supabase
      .from('notifications')
      .select('payload->>room_id, count')
      .eq('user_id', userId)
      .is('read_at', null)
      .in('type', ['mention', 'message']);

    const unreadMap = {};
    if (unreadCounts) {
      for (const n of unreadCounts) {
        const rid = n.room_id;
        unreadMap[rid] = (unreadMap[rid] || 0) + 1;
      }
    }

    const { data: rooms } = await supabase
      .from('rooms')
      .select('*, room_members(*)')
      .in('id', roomIds)
      .order('created_at', { ascending: false });

    res.send({
      ok: true,
      data: (rooms || []).map(r => ({
        ...r,
        unread: unreadMap[r.id] || 0,
      })),
    });
  }, null);

  server.on('rooms.create', async (req, res) => {
    const { name, type, description } = req.body;
    const userId = req.user.id;

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ name, type: type || 'public', description, owner_id: userId })
      .select()
      .single();

    if (error) return res.send({ ok: false, error: error.message });

    await supabase
      .from('room_members')
      .insert({ room_id: room.id, user_id: userId, role: 'owner' });

    server.publish(`presence:${room.id}`, {
      event: 'room_created',
      room,
      userId,
    });

    res.send({ ok: true, data: room });
  }, z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['public', 'private']).default('public'),
    description: z.string().max(500).optional(),
  }));

  server.on('rooms.join', async (req, res) => {
    const { roomId } = req.body;
    const userId = req.user.id;

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!room) return res.send({ ok: false, error: 'Room not found' });
    if (room.type === 'private') {
      const { data: member } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();
      if (!member) return res.send({ ok: false, error: 'Invite only' });
    }

    const { data: existing } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('room_members')
        .insert({ room_id: roomId, user_id: userId, role: 'member' });
    }

    await supabase
      .from('users')
      .update({ status: 'online' })
      .eq('id', userId);

    server.publish(`presence:${roomId}`, {
      event: 'user_joined',
      userId,
      username: req.user.username,
    });

    res.send({ ok: true });
  }, z.object({ roomId: z.string().uuid() }));

  server.on('rooms.leave', async (req, res) => {
    const { roomId } = req.body;
    const userId = req.user.id;

    await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    server.publish(`presence:${roomId}`, {
      event: 'user_left',
      userId,
      username: req.user.username,
    });

    res.send({ ok: true });
  }, z.object({ roomId: z.string().uuid() }));

  server.on('rooms.invite', async (req, res) => {
    const { roomId, userId: targetUserId } = req.body;
    const userId = req.user.id;

    const { data: membership } = await supabase
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role === 'member') {
      return res.send({ ok: false, error: 'Not authorized' });
    }

    await supabase
      .from('room_members')
      .insert({ room_id: roomId, user_id: targetUserId, role: 'member' });

    server.publish(`notify:${targetUserId}`, {
      event: 'room_invite',
      roomId,
      invitedBy: req.user.username,
    });

    res.send({ ok: true });
  }, z.object({
    roomId: z.string().uuid(),
    userId: z.string().uuid(),
  }));
}
