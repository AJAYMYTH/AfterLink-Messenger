import { cn } from '../../lib/utils.js';
import { Circle, Search } from 'lucide-react';

export function DMList({ inbox, activeUserId, onSelect }) {
  if (!inbox || inbox.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        <p>No conversations yet</p>
        <p className="text-xs mt-1">Search users to start a DM</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {inbox.map((conv) => (
        <button
          key={conv.user.id}
          onClick={() => onSelect(conv.user.id)}
          className={cn(
            'sidebar-item w-full text-left',
            activeUserId === conv.user.id && 'active'
          )}
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-xs font-medium">
              {(conv.user.display_name || conv.user.username || '?')[0].toUpperCase()}
            </div>
            <Circle size={7} className="absolute -bottom-0.5 -right-0.5 text-green-500 fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{conv.user.display_name || conv.user.username}</p>
            <p className="text-xs text-gray-500 truncate">{conv.lastMessage?.content}</p>
          </div>
          {conv.unread > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {conv.unread > 99 ? '99+' : conv.unread}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
