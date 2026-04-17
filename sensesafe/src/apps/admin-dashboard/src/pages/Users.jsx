import React, { useState, useEffect } from 'react';
import { Search, Users as UsersIcon, Shield, User } from 'lucide-react';
import { getAllUsers } from '../services/api.js';

function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const data = await getAllUsers({ search: searchTerm, page_size: 100 });
        setUsers(data?.users || []);
        setTotal(data?.total || 0);
      } catch (e) {
        console.error(e);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const abilityColor = (ability) => {
    if (!ability || ability === 'NONE') return 'bg-green-900/40 text-green-300 border border-green-700';
    return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700';
  };

  const roleColor = (role) => {
    if (role === 'ADMIN') return 'bg-purple-900/40 text-purple-300 border border-purple-700';
    if (role === 'RESPONDER') return 'bg-blue-900/40 text-blue-300 border border-blue-700';
    return 'bg-gray-800 text-gray-400 border border-gray-700';
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                  <th className="px-5 py-3 text-left font-medium">User</th>
                  <th className="px-5 py-3 text-left font-medium">Email</th>
                  <th className="px-5 py-3 text-left font-medium">Role</th>
                  <th className="px-5 py-3 text-left font-medium">Ability</th>
                  <th className="px-5 py-3 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-gray-200 font-medium">{user.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${abilityColor(user.ability)}`}>
                        {user.ability || 'NONE'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Users;
