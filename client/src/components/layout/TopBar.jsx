import { useChatStore } from '../../stores/chatStore.js';
import { useRoomStore } from '../../stores/roomStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { cn } from '../../lib/utils.js';
import { Search, Users, Settings, BarChart3, LogOut } from 'lucide-react';

export function TopBar() {
  const { activeRoomId, isDM, activeUserId, dmInbox } = useChatStore();
  const { rooms } = useRoomStore();
  const { toggleMembers, toggleSearch, toggleCreateRoom, toggleSettings, togglePerformance } = useUIStore();
  const { user, logout } = useAuthStore();

  let title = 'AfterLink Messenger';
  if (isDM && activeUserId) {
    const conv = dmInbox.find(d => d.user?.id === activeUserId);
    title = conv?.user?.display_name || conv?.user?.username || 'Direct Message';
  } else if (activeRoomId) {
    const room = rooms.find(r => r.id === activeRoomId);
    title = room?.name || 'Loading...';
  }

  return (
    <div className="h-14 border-b border-dark-surface flex items-center justify-between px-4 bg-dark-bg shrink-0">
      <h2 className="font-semibold text-white truncate">{title}</h2>
      <div className="flex items-center gap-1">
        <button onClick={toggleSearch} className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition" title="Search">
          <Search size={18} />
        </button>

        {activeRoomId && !isDM && (
          <button onClick={toggleMembers} className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition" title="Members">
            <Users size={18} />
          </button>
        )}
        <button onClick={togglePerformance} className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition" title="Performance">
          <BarChart3 size={18} />
        </button>
        <button onClick={toggleSettings} className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition" title="Settings">
          <Settings size={18} />
        </button>
        <button onClick={logout} className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition ml-1" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
