import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { request } from '../../lib/afterlink.js';
import { Search, MessageCircle, X, Loader2 } from 'lucide-react';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const { setActiveDM, subscribeToDM, loadDMInbox } = useChatStore();
  const { showSearch, toggleSearch } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (showSearch && inputRef.current) inputRef.current.focus();
  }, [showSearch]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await request('users.search', { query: query.trim() });
        if (res.ok) setResults(res.data.filter(u => u.id !== user.id));
      } catch {}
      setLoading(false);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user.id]);

  const startDM = (targetUser) => {
    setActiveDM(targetUser.id);
    subscribeToDM(targetUser.id);
    loadDMInbox();
    toggleSearch();
    setQuery('');
  };

  if (!showSearch) return null;

  return (
    <div className="absolute top-14 right-4 w-96 bg-dark-surface border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="p-3 border-b border-gray-700 flex items-center gap-2">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or username..."
          className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
        />
        {loading && <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />}
        <button onClick={() => { toggleSearch(); setQuery(''); }} className="p-1 hover:bg-dark-bg rounded text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {searched && results.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-500">No users found</p>
        )}
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => startDM(u)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-bg transition text-left"
          >
            <div className="w-9 h-9 rounded-full bg-dark-bg flex items-center justify-center text-sm font-medium text-white shrink-0">
              {(u.display_name || u.username || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{u.display_name || u.username}</p>
              <p className="text-xs text-gray-500 truncate">@{u.username}</p>
            </div>
            <MessageCircle size={16} className="text-primary shrink-0" />
          </button>
        ))}
        {!searched && query.trim() && loading && (
          <p className="p-4 text-center text-sm text-gray-500">Searching...</p>
        )}
      </div>
    </div>
  );
}
