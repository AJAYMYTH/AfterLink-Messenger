import { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm.jsx';
import { RegisterForm } from '../components/auth/RegisterForm.jsx';

export function AuthPage() {
  const [mode, setMode] = useState('login');

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 100 100" className="w-10 h-10">
              <path d="M30 65 L30 40 Q30 30 40 30 L60 30 Q70 30 70 40 L70 55 Q70 65 60 65 L45 65 L35 72 L37 65 Z" fill="#fff" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">AfterLink Messenger</h1>
          <p className="text-gray-400 mt-1">Real-time messaging over the AfterLink protocol</p>
        </div>

        <div className="bg-dark-surface rounded-xl p-6">
          {mode === 'login' ? (
            <LoginForm onSwitch={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitch={() => setMode('login')} />
          )}
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Powered by AfterLink binary protocol &middot; 10-byte frames &middot; 76% faster than WebSocket
        </p>
      </div>
    </div>
  );
}
