import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { cn, formatTime } from '../../lib/utils.js';
import { Trash2, Reply, FileText, Image, Download, X } from 'lucide-react';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageBubble({ message, isOwn, showAvatar }) {
  const { deleteMessage, reactToMessage } = useChatStore();
  const { user } = useAuthStore();
  const [showReactions, setShowReactions] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const sender = message.sender || {};
  const senderName = sender.display_name || sender.username || 'Unknown';
  const senderInitial = senderName[0]?.toUpperCase() || '?';

  const handleDelete = async () => {
    await deleteMessage(message.id);
  };

  const handleReact = async (emoji) => {
    await reactToMessage(message.id, emoji);
    setShowReactions(false);
  };

  const reactionCounts = {};
  if (message.reactions) {
    for (const r of message.reactions) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    }
  }

  const fileMatch = message.content?.match(/^\[File\] (.+?): (.+)$/);
  const isImage = fileMatch && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileMatch[1]);

  return (
    <div className={cn('flex items-end gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {showAvatar && !isOwn && (
        <div className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center text-xs font-medium shrink-0">
          {senderInitial}
        </div>
      )}
      {!showAvatar && <div className="w-8 shrink-0" />}

      <div className={cn('max-w-[75%]', isOwn && 'items-end flex flex-col')}>
        {showAvatar && !isOwn && (
          <p className="text-xs text-gray-500 mb-0.5 ml-1">{senderName}</p>
        )}
        <div className={cn('message-bubble relative', isOwn ? 'own' : 'other')}>
          {fileMatch ? (
            <div>
              {isImage ? (
                <img src={fileMatch[2]} alt={fileMatch[1]} onClick={() => setLightbox(fileMatch[2])} className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition" />
              ) : (
                <a href={fileMatch[2]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-lg bg-dark-bg/50 hover:bg-dark-bg transition">
                  <FileText size={24} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileMatch[1]}</p>
                    <p className="text-xs text-gray-500">Click to download</p>
                  </div>
                  <Download size={16} className="text-gray-400 shrink-0" />
                </a>
              )}
              <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                <span className="text-[10px] opacity-60">{formatTime(message.created_at)}</span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                <span className="text-[10px] opacity-60">{formatTime(message.created_at)}</span>
              </div>
            </>
          )}

          {Object.keys(reactionCounts).length > 0 && (
            <div className={cn('flex gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xs bg-dark-bg/50 rounded-full px-1.5 py-0.5"
                >
                  {emoji} {count > 1 && count}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={cn('flex gap-1 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
          {isOwn && (
            <button onClick={handleDelete} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-red-400 transition">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 bg-dark-surface rounded-full text-white hover:bg-gray-700 z-10" onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {showReactions && (
        <div className="absolute bottom-full bg-dark-surface rounded-lg p-1.5 flex gap-1 shadow-lg border border-dark-bg">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="hover:scale-125 transition text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
