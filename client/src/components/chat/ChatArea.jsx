import { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { MessageList } from './MessageList.jsx';
import { MessageInput } from './MessageInput.jsx';
import { MessageCircle } from 'lucide-react';

export function ChatArea() {
  const { activeRoomId, isDM, activeUserId, messages, loadHistory, loadDMHistory, dmInbox } = useChatStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (activeRoomId) loadHistory(activeRoomId);
    else if (activeUserId) loadDMHistory(activeUserId);
  }, [activeRoomId, activeUserId]);

  const hasContent = activeRoomId || activeUserId;

  if (!hasContent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <MessageCircle size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">Welcome to AfterLink Messenger</h3>
          <p className="text-sm text-gray-600 mt-1">Select a room or DM to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-bg min-h-0">
      <MessageList />
      <MessageInput />
    </div>
  );
}
