import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore.js';
import { AuthPage } from './pages/AuthPage.jsx';
import { ChatPage } from './pages/ChatPage.jsx';

export default function App() {
  const { user, initialize, isConnected } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (!user && !isConnected) return <AuthPage />;

  return (
    <>
      <ChatPage />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16213E',
            color: '#fff',
            border: '1px solid #1A1A2E',
          },
        }}
      />
    </>
  );
}
