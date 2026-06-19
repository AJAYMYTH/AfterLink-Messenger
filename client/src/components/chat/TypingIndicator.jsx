import { useChatStore } from '../../stores/chatStore.js';
import { useAuthStore } from '../../stores/authStore.js';

export function TypingIndicator() {
  const { activeRoomId, typingUsers } = useChatStore();
  const { user } = useAuthStore();

  const key = activeRoomId || 'dm';
  const typers = Object.values(typingUsers[key] || {}).filter(t => t.userId !== user?.id);

  if (typers.length === 0) return null;

  const names = typers.map(t => t.username);
  const label = names.length === 1
    ? `${names[0]} is typing...`
    : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-gray-500 italic">{label}</span>
    </div>
  );
}
