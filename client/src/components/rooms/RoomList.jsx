import { cn } from '../../lib/utils.js';
import { Hash, Lock } from 'lucide-react';

export function RoomList({ rooms, activeRoomId, onSelect }) {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <p>No rooms yet</p>
        <p className="text-xs mt-1">Click + to create one</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => onSelect(room.id)}
          className={cn(
            'sidebar-item w-full text-left',
            activeRoomId === room.id && 'active'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-dark-bg flex items-center justify-center shrink-0">
            {room.type === 'private' ? <Lock size={14} className="text-gray-400" /> : <Hash size={14} className="text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{room.name}</p>
            {room.description && <p className="text-xs text-gray-500 truncate">{room.description}</p>}
          </div>
          {room.unread > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {room.unread > 99 ? '99+' : room.unread}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
