import { useState, useRef, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useRoomStore } from '../../stores/roomStore.js';
import { request } from '../../lib/afterlink.js';
import { Send, Paperclip, Smile } from 'lucide-react';
import toast from 'react-hot-toast';

const EMOJI_LIST = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '😢', '😮', '🙏', '💯'];

export function MessageInput() {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimer = useRef(null);
  const { activeRoomId, activeUserId, isDM, sendMessage, sendDM } = useChatStore();
  const fileRef = useRef(null);

  const emitTyping = useCallback((typing) => {
    if (!activeRoomId) return;
    request('presence.typing', { roomId: activeRoomId, isTyping: typing });
  }, [activeRoomId]);

  const handleChange = (e) => {
    setText(e.target.value);
    if (activeRoomId) {
      emitTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => emitTyping(false), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (activeRoomId) emitTyping(false);

    let success;
    if (isDM) success = await sendDM(activeUserId, trimmed);
    else success = await sendMessage(activeRoomId, trimmed);

    if (success) setText('');
    setShowEmoji(false);
  };

  const handleFileClick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large. Max 10MB'); return; }
    toast.loading('Uploading...');
    try {
      const res = await request('files.upload', {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
      if (!res.ok) { toast.dismiss(); toast.error(res.error || 'Upload failed'); return; }

      await fetch(res.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      const text = `[File] ${file.name}: ${res.data.publicUrl}`;
      if (isDM) await sendDM(activeUserId, text);
      else await sendMessage(activeRoomId, text);
      toast.dismiss();
      toast.success('File uploaded');
    } catch {
      toast.dismiss();
      toast.error('Upload failed');
    }
    e.target.value = '';
  };

  const addEmoji = (emoji) => {
    setText((t) => t + emoji);
  };

  return (
    <div className="border-t border-dark-surface px-4 py-3 bg-dark-bg shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition"
        >
          <Smile size={20} />
        </button>
        <button
          type="button"
          onClick={handleFileClick}
          className="p-2 rounded-lg hover:bg-dark-surface text-gray-400 hover:text-white transition"
        >
          <Paperclip size={20} />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        <input
          type="text"
          value={text}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1 bg-dark-surface border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
          maxLength={4000}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </form>
      {showEmoji && (
        <div className="flex gap-1.5 mt-2 p-2 bg-dark-surface rounded-lg">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
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
