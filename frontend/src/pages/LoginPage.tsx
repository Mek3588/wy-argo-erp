import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StaffMember, Role } from '../types';
import {
  Milk,
  Delete,
  RotateCcw,
  AlertCircle,
  KeyRound,
  Check,
  UserCheck,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithPin, login } = useAuth();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usePasswordFallback, setUsePasswordFallback] = useState(false);

  // Password fallback state
  const [username, setUsername] = useState('admin@wyargo.com');
  const [password, setPassword] = useState('admin123');

  // Load staff list on mount
  useEffect(() => {
    api.getStaffList()
      .then((res) => {
        setStaffList(res.staff);
        if (res.staff.length > 0) {
          // Default to the first staff member (e.g., Admin)
          setSelectedStaff(res.staff[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load staff list:', err);
      });
  }, []);

  // Demo default PIN hints
  const demoPinHints: Record<string, string> = {
    admin: '111111',
    manager: '222222',
    cashier: '333333',
    inventory: '444444',
  };

  const roleColors: Record<Role, { badge: string; border: string; bg: string }> = {
    ADMIN: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      border: 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/50',
      bg: 'bg-rose-600',
    },
    MANAGER: {
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      border: 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/50',
      bg: 'bg-purple-600',
    },
    SALES_CASHIER: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      border: 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/50',
      bg: 'bg-emerald-600',
    },
    INVENTORY_CLERK: {
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      border: 'border-blue-400 ring-2 ring-blue-400/20 bg-blue-50/50',
      bg: 'bg-blue-600',
    },
  };

  // Submit PIN
  const handlePinSubmit = useCallback(
    async (pinToSubmit: string) => {
      if (pinToSubmit.length < 6 || submitting) return;

      try {
        setSubmitting(true);
        setError(null);
        await loginWithPin(pinToSubmit, selectedStaff ? selectedStaff.id : undefined);
      } catch (err: any) {
        setError(err.message || 'Invalid PIN code. Please try again.');
        setPin(''); // Reset PIN on error
      } finally {
        setSubmitting(false);
      }
    },
    [loginWithPin, selectedStaff, submitting]
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

  // Fast auto-login button for demo convenience
  const handleAutoFillAndLogin = (staff: StaffMember) => {
    const hint = demoPinHints[staff.username] || '111111';
    setSelectedStaff(staff);
    setPin(hint);
    handlePinSubmit(hint);
  };

  // Password fallback submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-2xl w-full bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col md:flex-row">
        {/* Left Column: Staff Directory & Info */}
        <div className="md:w-5/12 bg-slate-900/90 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Milk className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight leading-none">
                  WY Argo <span className="text-blue-400">Dairy ERP</span>
                </h1>
                <p className="text-[11px] text-slate-400 mt-1">Staff PIN Terminal</p>
              </div>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Staff Profile:
            </p>

            {/* Staff list cards */}
            <div className="space-y-2">
              {staffList.map((s) => {
                const isSelected = selectedStaff?.id === s.id;
                const colors = roleColors[s.role] || roleColors.ADMIN;
                const pinHint = demoPinHints[s.username] || '1111';

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStaff(s);
                      setPin('');
                      setError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? colors.border
                        : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-white leading-tight">
                        {s.full_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${colors.badge}`}
                        >
                          {s.role}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          PIN: <b className="text-blue-400">{pinHint}</b>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoFillAndLogin(s);
                      }}
                      className="px-2 py-1 bg-slate-700 hover:bg-blue-600 text-white rounded text-[10px] font-semibold transition-colors"
                      title="Instant 1-Click Login"
                    >
                      Login →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              onClick={() => {
                setUsePasswordFallback(!usePasswordFallback);
                setError(null);
              }}
              className="text-xs text-slate-400 hover:text-white underline transition-colors"
            >
              {usePasswordFallback ? '← Back to PIN Keypad' : 'Sign In with Username & Password'}
            </button>
          </div>
        </div>

        {/* Right Column: Keypad Entry OR Password Form */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-center items-center bg-slate-950">
          {error && (
            <div className="w-full mb-4 bg-rose-950/80 border border-rose-800 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!usePasswordFallback ? (
            <div className="w-full max-w-xs flex flex-col items-center">
              {/* Selected staff pill */}
              <div className="text-center mb-5">
                <div className="text-xs text-slate-400">Logging in as:</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {selectedStaff?.full_name || 'Select Staff Member'}
                </div>
                <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                  Demo PIN: {selectedStaff ? demoPinHints[selectedStaff.username] || '111111' : '111111'}
                </div>
              </div>

              {/* 6-digit PIN Visual Indicator Dots */}
              <div className="flex items-center justify-center gap-3 mb-6">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                        isFilled
                          ? 'bg-blue-500 shadow-md shadow-blue-500/50 scale-110'
                          : 'border-2 border-slate-700 bg-slate-800/40'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Touch/Mouse Keypad */}
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleNumberClick(digit)}
                    disabled={submitting}
                    className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xl border border-slate-800 transition-all shadow-xs flex items-center justify-center"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear */}
                <button
                  onClick={handleClear}
                  className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800/80 transition-all flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </button>

                {/* 0 */}
                <button
                  onClick={() => handleNumberClick('0')}
                  disabled={submitting}
                  className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xl border border-slate-800 transition-all shadow-xs flex items-center justify-center"
                >
                  0
                </button>

                {/* Backspace */}
                <button
                  onClick={handleBackspace}
                  className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800/80 transition-all flex items-center justify-center gap-1"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-4 text-center">
                Tip: You can also use your computer's <b>keyboard numpad</b> to enter your PIN.
              </p>
            </div>
          ) : (
            /* Traditional Password Form Fallback */
            <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs space-y-4 text-xs">
              <h3 className="font-bold text-white text-base text-center mb-4">
                Password Sign In
              </h3>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email / Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
              >
                {submitting ? 'Signing In...' : 'Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
