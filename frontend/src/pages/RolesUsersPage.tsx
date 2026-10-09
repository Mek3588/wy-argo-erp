import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { User, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import {
  ShieldCheck,
  UserPlus,
  Check,
  X,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react';

export const RolesUsersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    pin: '',
    full_name: '',
    role: 'SALES_CASHIER' as Role,
  });

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-300',
    MANAGER: 'bg-purple-100 text-purple-800 border-purple-300',
    SALES_CASHIER: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    INVENTORY_CLERK: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err: any) {
      alert(`Error loading users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
          ...(form.pin ? { pin: form.pin } : {}),
        });
      } else {
        await api.createUser(form);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setForm({
        username: '',
        email: '',
        password: '',
        pin: '',
        full_name: '',
        role: 'SALES_CASHIER',
      });
      loadUsers();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      pin: '',
      full_name: u.full_name,
      role: u.role,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.updateUser(u.id, { is_active: u.is_active === 1 ? 0 : 1 });
      loadUsers();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`Are you sure you want to delete user "${u.full_name}"?`)) return;
    try {
      await api.deleteUser(u.id);
      loadUsers();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Role Management & Staff Access</h2>
          <p className="text-sm text-slate-500">
            Control Role-Based Access Control (RBAC) across inventory, sales cashier, and cash flow.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingUser(null);
              setForm({
                username: '',
                email: '',
                password: '',
                pin: '',
                full_name: '',
                role: 'SALES_CASHIER',
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Role Permission Matrix Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Dairy ERP Role Permission Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Inventory & Batches</th>
                <th className="py-2.5 px-3">Sales / POS Counter</th>
                <th className="py-2.5 px-3">Expense Management</th>
                <th className="py-2.5 px-3">Cash Flow & Ledger</th>
                <th className="py-2.5 px-3">User & Role Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-bold text-rose-700">ADMIN</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-purple-700">MANAGER</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-2.5 px-3 text-slate-400">View Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-700">SALES_CASHIER</td>
                <td className="py-2.5 px-3 text-slate-400">View Only</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Process Sales</td>
                <td className="py-2.5 px-3 text-rose-400">✗ No Access</td>
                <td className="py-2.5 px-3 text-rose-400">✗ No Access</td>
                <td className="py-2.5 px-3 text-rose-400">✗ No Access</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-blue-700">INVENTORY_CLERK</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Batches & Spoilage</td>
                <td className="py-2.5 px-3 text-rose-400">✗ No Access</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">✓ Log Sourcing Costs</td>
                <td className="py-2.5 px-3 text-rose-400">✗ No Access</td>
                <td className="py-2.5 px-3 text-rose-400">✗ No Access</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Configured Staff Accounts ({users.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Name & Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4 text-center">Login PIN</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{u.full_name}</div>
                    <div className="text-xs font-mono text-slate-400">@{u.username}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        roleColors[u.role]
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      ✓ Active PIN
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      disabled={!isAdmin || u.id === currentUser?.id}
                      onClick={() => handleToggleActive(u)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        u.is_active === 1
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {u.is_active === 1 ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">{u.created_at}</td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? `Edit Staff: ${editingUser.full_name}` : 'Add New Staff Member'}
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Almaz Bekele"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                required
                disabled={!!editingUser}
                type="text"
                placeholder="almaz.b"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                required
                type="email"
                placeholder="almaz@wyargo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value.trim() })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingUser ? 'New Password (Optional)' : 'Password'}
              </label>
              <input
                required={!editingUser}
                type="password"
                placeholder={editingUser ? 'Leave blank to keep' : '••••••••'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                <option value="SALES_CASHIER">SALES_CASHIER (Counter & POS)</option>
                <option value="INVENTORY_CLERK">INVENTORY_CLERK (Intake & Spoilage)</option>
                <option value="MANAGER">MANAGER (Operations & Finance)</option>
                <option value="ADMIN">ADMIN (Full Access)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {editingUser ? 'Change 4-Digit Login PIN (Optional)' : '4-Digit Login PIN'}
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder={editingUser ? 'Leave blank to keep current PIN' : 'e.g. 5555'}
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Staff members use this numeric PIN to log into the ERP terminal.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingUser(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
            >
              {editingUser ? 'Update Staff Member' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
