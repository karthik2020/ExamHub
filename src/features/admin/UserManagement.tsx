import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, Users } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Role, User, UserTier } from '../../types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    adminService
      .getUsers()
      .then((data) => {
        setUsers(data);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load users');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role, newTier: UserTier) => {
    try {
      const updated = await adminService.updateUserRole(userId, newRole, newTier);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err: any) {
      alert(`Role update error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-black text-white tracking-tight">User Management & RBAC</h1>
        <p className="text-xs text-slate-400 mt-1">
          Control role-based access control permissions (Student, Tenant Admin, Super Admin) and membership tiers.
        </p>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchUsers}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Registered Platform Candidates & Staff</h3>
          <span className="text-xs text-slate-400">{users.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Access Tier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center font-bold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role, u.tier)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={u.tier}
                      onChange={(e) => handleRoleChange(u.id, u.role, e.target.value as UserTier)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                    >
                      <option value="GUEST">GUEST (10 Fixed)</option>
                      <option value="REGISTERED">REGISTERED (20 Fixed)</option>
                      <option value="PAID">PAID (Unlimited Procedural)</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-right text-teal-400 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-[10px]">
                      Active Status
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
