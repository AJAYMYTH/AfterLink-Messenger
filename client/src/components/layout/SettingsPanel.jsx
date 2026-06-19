import { useUIStore } from '../../stores/uiStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { X, User, Shield, Bell } from 'lucide-react';

export function SettingsPanel() {
  const { showSettings, toggleSettings } = useUIStore();
  const { user } = useAuthStore();

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={toggleSettings}>
      <div className="bg-dark-surface rounded-xl w-full max-w-md mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Settings</h3>
          <button onClick={toggleSettings} className="p-1 hover:bg-dark-bg rounded text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {(user?.display_name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-medium">{user?.display_name || user?.username}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-bg text-gray-400 hover:text-white transition text-sm">
              <User size={16} /> Profile
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-bg text-gray-400 hover:text-white transition text-sm">
              <Shield size={16} /> Privacy
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-bg text-gray-400 hover:text-white transition text-sm">
              <Bell size={16} /> Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
