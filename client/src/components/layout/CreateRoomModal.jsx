import { useState } from 'react';
import { useRoomStore } from '../../stores/roomStore.js';
import { useUIStore } from '../../stores/uiStore.js';
import { X, Hash, Lock } from 'lucide-react';

export function CreateRoomModal() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('public');
  const [loading, setLoading] = useState(false);
  const { createRoom, joinRoom } = useRoomStore();
  const { showCreateRoom, toggleCreateRoom } = useUIStore();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const room = await createRoom(name.trim(), type, description.trim());
    if (room) {
      await joinRoom(room.id);
      setName('');
      setDescription('');
      setType('public');
      toggleCreateRoom();
    }
    setLoading(false);
  };

  if (!showCreateRoom) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={toggleCreateRoom}>
      <div className="bg-dark-surface rounded-xl w-full max-w-md mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Create Room</h3>
          <button onClick={toggleCreateRoom} className="p-1 hover:bg-dark-bg rounded text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Room name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. general"
              required
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
              placeholder="What's this room about?"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType('public')}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition ${type === 'public' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-700 text-gray-400 hover:text-white'}`}
              >
                <Hash size={16} />
                Public
              </button>
              <button
                type="button"
                onClick={() => setType('private')}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition ${type === 'private' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-700 text-gray-400 hover:text-white'}`}
              >
                <Lock size={16} />
                Private
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary-600 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
