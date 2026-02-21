import { useState } from 'react';

const CORRECT_PASSWORD = 'food';
const STORAGE_KEY = 'moneyball_auth';

// Shows a password prompt before the app loads.
// Once the correct password is entered, it's remembered in localStorage.
export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return children;

  function handleSubmit(e) {
    e.preventDefault();
    if (input === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm mx-4 p-8 border border-gray-200 rounded-xl shadow-sm text-center">
        <div className="mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: '#E6F0FA' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">McKesson Moneyball</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className={`w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 ${
              error
                ? 'border-red-400 focus:ring-red-200'
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
          {error && (
            <p className="text-xs text-red-500 -mt-2">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0066CC' }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
