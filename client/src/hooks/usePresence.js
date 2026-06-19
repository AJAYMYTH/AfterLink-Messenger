import { useEffect, useState, useRef, useCallback } from 'react';
import { subscribe, request } from '../lib/afterlink.js';

export function usePresence(roomId) {
  const [users, setUsers] = useState({});
  const subsRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const unsub = subscribe(`presence:${roomId}`, (event) => {
      if (event.event === 'status_change') {
        setUsers((prev) => ({ ...prev, [event.userId]: event.status }));
      } else if (event.event === 'typing') {
        setUsers((prev) => ({
          ...prev,
          [event.userId]: { ...prev[event.userId], typing: event.isTyping },
        }));
      }
    });

    return () => unsub?.();
  }, [roomId]);

  const emitTyping = useCallback((isTyping) => {
    request('presence.typing', { roomId, isTyping });
  }, [roomId]);

  const emitStatus = useCallback((status) => {
    request('presence.online', { status });
  }, []);

  return { users, emitTyping, emitStatus };
}
