import { useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { MessageBubble } from './MessageBubble.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { formatDate } from '../../lib/utils.js';

export function MessageList() {
  const { messages, isDM, activeUserId, dms, activeRoomId, typingUsers, loadHistory, loadDMHistory } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const displayMessages = isDM ? (dms[activeUserId] || []) : messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (el && el.scrollTop < 100) {
      const firstMsg = displayMessages[0];
      if (firstMsg) {
        if (isDM) loadDMHistory(activeUserId, firstMsg.created_at);
        else loadHistory(activeRoomId, firstMsg.created_at);
      }
    }
  };

  let lastDate = '';

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
    >
      {displayMessages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
        </div>
      )}
      {displayMessages.map((msg, i) => {
        const msgDate = formatDate(msg.created_at);
        const showDate = msgDate !== lastDate;
        lastDate = msgDate;
        const isOwn = msg.sender_id === user?.id || msg.sender?.id === user?.id;
        const prevMsg = i > 0 ? displayMessages[i - 1] : null;
        const sameSender = prevMsg && (prevMsg.sender_id === msg.sender_id || prevMsg.sender?.id === msg.sender?.id);
        const showAvatar = !sameSender;

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-3">
                <span className="text-xs text-gray-600 bg-dark-surface px-2 py-1 rounded-full">{msgDate}</span>
              </div>
            )}
            <MessageBubble
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
            />
          </div>
        );
      })}
      <TypingIndicator />
      <div ref={bottomRef} />
    </div>
  );
}
