import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore.js';

export function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) toast.success('Welcome back!');
    else toast.error('Login failed');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4">Sign in</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary-600 transition disabled:opacity-50"
      >
        {isLoading ? 'Connecting...' : 'Sign in'}
      </button>
      <p className="text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-primary hover:underline">
          Register
        </button>
      </p>
    </form>
  );
}
