import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore.js';

export function RegisterForm({ onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const success = await register(form.username, form.email, form.password, form.displayName);
    if (success) toast.success('Account created!');
    else toast.error('Registration failed');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4">Create account</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Username</label>
        <input
          type="text"
          value={form.username}
          onChange={handleChange('username')}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="johndoe"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Display name (optional)</label>
        <input
          type="text"
          value={form.displayName}
          onChange={handleChange('displayName')}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
          placeholder="Min 6 characters"
          required
          minLength={6}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary-600 transition disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Create account'}
      </button>
      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-primary hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}
