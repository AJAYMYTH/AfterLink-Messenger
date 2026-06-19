import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { useRoomStore } from '../../stores/roomStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { Sidebar } from '../rooms/Sidebar.jsx';
import { TopBar } from './TopBar.jsx';
import { ChatArea } from '../chat/ChatArea.jsx';
import { MemberPanel } from './MemberPanel.jsx';
import { PerformanceDashboard } from '../dashboard/PerformanceDashboard.jsx';
import { SearchPanel } from './SearchPanel.jsx';
import { CreateRoomModal } from './CreateRoomModal.jsx';
import { SettingsPanel } from './SettingsPanel.jsx';

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { loadRooms } = useRoomStore();
  const { loadDMInbox, activeRoomId, activeUserId, isDM } = useChatStore();
  const { showMembers, showPerformance } = useUIStore();

  useEffect(() => {
    loadRooms();
    loadDMInbox();
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-dark-bg">
      <Sidebar user={user} onLogout={logout} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <TopBar />
        <SearchPanel />
        <ChatArea />
      </div>
      <CreateRoomModal />
      <SettingsPanel />
      {showMembers && activeRoomId && !isDM && <MemberPanel />}
      {showPerformance && <PerformanceDashboard />}
    </div>
  );
}
