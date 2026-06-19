import { z } from 'zod';
import supabase from '../db/supabase.js';

export function registerPresenceRoutes(server) {
  server.on('presence.online', async (req, res) => {
    const { status } = req.body;
    const userId = req.user.id;

    await supabase.from('users').update({ status: status || 'online' }).eq('id', userId);

    const { data: rooms } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId);

    if (rooms) {
      for (const { room_id } of rooms) {
        server.publish(`presence:${room_id}`, {
          event: 'status_change',
          userId,
          username: req.user.username,
          status: status || 'online',
        });
      }
    }

    res.send({ ok: true });
  }, z.object({
    status: z.enum(['online', 'away', 'dnd', 'invisible']).optional(),
  }));

  server.on('presence.typing', async (req, res) => {
    const { roomId, isTyping } = req.body;

    server.publish(`presence:${roomId}`, {
      event: 'typing',
      userId: req.user.id,
      username: req.user.username,
      isTyping: !!isTyping,
    });

    res.send({ ok: true });
  }, z.object({
    roomId: z.string().uuid(),
    isTyping: z.boolean().optional(),
  }));
}
