import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { useRoomStore } from '../../stores/roomStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { RoomList } from './RoomList.jsx';
import { DMList } from './DMList.jsx';
import { cn } from '../../lib/utils.js';
import { MessageSquare, MessageCircle, Circle, Plus, LogOut } from 'lucide-react';

export function Sidebar({ user, onLogout }) {
  const { rooms, isLoading: roomsLoading } = useRoomStore();
  const { dmInbox, activeRoomId, activeUserId, isDM, setActiveRoom, setActiveDM, subscribeToRoom, subscribeToDM } = useChatStore();
  const { activeTab, setActiveTab, toggleCreateRoom } = useUIStore();

  const handleSelectRoom = (roomId) => {
    setActiveRoom(roomId);
    subscribeToRoom(roomId);
  };

  const handleSelectDM = (userId) => {
    setActiveDM(userId);
    subscribeToDM(userId);
  };

  return (
    <div className="w-72 bg-dark-surface border-r border-dark-bg flex flex-col shrink-0">
      <div className="h-14 border-b border-dark-bg flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white">AfterLink</span>
        </div>
        <button onClick={toggleCreateRoom} className="p-1.5 rounded-lg hover:bg-dark-bg text-gray-400 hover:text-white transition">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex border-b border-dark-bg">
        <button
          onClick={() => setActiveTab('rooms')}
          className={cn('flex-1 py-2.5 text-sm font-medium transition', activeTab === 'rooms' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white')}
        >
          <MessageSquare size={14} className="inline mr-1.5" />Rooms
        </button>
        <button
          onClick={() => setActiveTab('dms')}
          className={cn('flex-1 py-2.5 text-sm font-medium transition', activeTab === 'dms' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white')}
        >
          <MessageCircle size={14} className="inline mr-1.5" />DMs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'rooms' ? (
          <RoomList rooms={rooms} activeRoomId={activeRoomId} onSelect={handleSelectRoom} />
        ) : (
          <DMList inbox={dmInbox} activeUserId={activeUserId} onSelect={handleSelectDM} />
        )}
      </div>

      <div className="h-16 border-t border-dark-bg flex items-center px-4 gap-3">
        <div className="w-9 h-9 rounded-full bg-dark-bg flex items-center justify-center text-sm font-medium text-white">
          {user?.display_name?.[0] || user?.username?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{user?.display_name || user?.username}</p>
          <p className="text-xs text-green-500">Online</p>
        </div>
        <button onClick={onLogout} className="p-2 rounded-lg hover:bg-dark-bg text-gray-400 hover:text-white transition">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
