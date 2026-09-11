import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AuditLog } from '../../types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getAuditLogs()
      .then((data) => setLogs(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-2xl font-black text-white tracking-tight">Security & System Audit Logs</h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event trails recording exam starts, submissions, question authoring, and RBAC privilege modifications.
        </p>
      </div>

      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Event Stream</h3>
          <span className="text-xs text-slate-400">{logs.length} logged actions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Payload Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 text-slate-400 font-sans text-xs">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-teal-400">{log.action}</td>
                  <td className="py-3.5 px-4 text-slate-300">{log.entity_type}</td>
                  <td className="py-3.5 px-4 text-slate-400">{log.entity_id?.slice(0, 8)}...</td>
                  <td className="py-3.5 px-4 text-slate-400">{log.user_id?.slice(0, 8)}...</td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate font-sans text-xs">
                    {JSON.stringify(log.payload)}
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
