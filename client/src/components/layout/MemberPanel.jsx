import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { subscribe } from '../../lib/afterlink.js';
import { X, Circle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const statusColors = {
  online: 'text-green-500',
  away: 'text-yellow-500',
  dnd: 'text-red-500',
  invisible: 'text-gray-500',
};

export function MemberPanel() {
  const { activeRoomId } = useChatStore();
  const { user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (!activeRoomId) return;

    const unsub = subscribe(`presence:${activeRoomId}`, (event) => {
      if (event.event === 'status_change') {
        setStatuses((s) => ({ ...s, [event.userId]: event.status }));
      }
    });

    return () => unsub?.();
  }, [activeRoomId]);

  return (
    <div className="w-60 border-l border-dark-surface bg-dark-bg flex flex-col shrink-0">
      <div className="h-14 border-b border-dark-surface flex items-center justify-between px-4">
        <span className="text-sm font-medium text-gray-400">Members</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {members.map((m) => (
          <div key={m.id || m.user_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-dark-surface">
            <Circle size={8} className={cn('fill-current', statusColors[statuses[m.user_id] || 'online'])} />
            <div className="w-7 h-7 rounded-full bg-dark-surface flex items-center justify-center text-xs font-medium text-gray-300">
              {(m.display_name || m.username || '?')[0].toUpperCase()}
            </div>
            <span className="text-sm text-white truncate">{m.display_name || m.username}</span>
            {m.user_id === user?.id && <span className="text-xs text-gray-500">(you)</span>}
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-gray-500 text-xs text-center py-8">No members loaded</p>
        )}
      </div>
    </div>
  );
}
