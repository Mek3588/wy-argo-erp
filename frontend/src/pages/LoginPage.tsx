import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Milk,
  Delete,
  RotateCcw,
  AlertCircle,
  KeyRound,
  Lock,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithPin, login } = useAuth();

  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usePasswordFallback, setUsePasswordFallback] = useState(false);

  // Password login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Submit PIN
  const handlePinSubmit = useCallback(
    async (pinToSubmit: string) => {
      if (pinToSubmit.length < 6 || submitting) return;

      try {
        setSubmitting(true);
        setError(null);
        await loginWithPin(pinToSubmit);
      } catch (err: any) {
        setError(err.message || 'Invalid PIN code. Please try again.');
        setPin(''); // Reset PIN on error
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithPin, submitting]
  );

  // Keypad click handlers
  const handleNumberClick = (num: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(null);
    if (newPin.length === 6) {
      handlePinSubmit(newPin);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  // Physical keyboard listener (numpad + digits)
  useEffect(() => {
    if (usePasswordFallback) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, usePasswordFallback, handlePinSubmit]);

  // Password fallback submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 p-8 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3">
            <Milk className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Bani Milk <span className="text-blue-500">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {usePasswordFallback ? 'Admin Password Sign In' : 'Enter Your 6-Digit Staff PIN'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-5 bg-rose-950/80 border border-rose-800 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {!usePasswordFallback ? (
          <div className="w-full flex flex-col items-center">
            {/* 6-digit PIN Visual Indicator Dots */}
            <div className="flex items-center justify-center gap-3.5 mb-8">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-blue-500 shadow-md shadow-blue-500/50 scale-125'
                        : 'border-2 border-slate-700 bg-slate-800/40'
                    }`}
                  />
                );
              })}
            </div>

            {/* Touch/Mouse Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleNumberClick(digit)}
                  disabled={submitting}
                  className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xl border border-slate-800 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Clear */}
              <button
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </button>

              {/* 0 */}
              <button
                onClick={() => handleNumberClick('0')}
                disabled={submitting}
                className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xl border border-slate-800 transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                0
              </button>

              {/* Backspace */}
              <button
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-5 text-center">
              You can also use your physical keyboard numpad to type your PIN.
            </p>
          </div>
        ) : (
          /* Admin Password Form */
          <form onSubmit={handlePasswordSubmit} className="w-full space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Username or Email</label>
              <input
                type="text"
                required
                value={username}
                placeholder="admin"
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-sm cursor-pointer shadow-md shadow-blue-600/30"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Toggle Mode */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 w-full text-center">
          <button
            onClick={() => {
              setUsePasswordFallback(!usePasswordFallback);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
          >
            {usePasswordFallback ? '← Switch to 6-Digit PIN Pad' : 'Sign In with Username & Password →'}
          </button>
        </div>
      </div>
    </div>
  );
};
