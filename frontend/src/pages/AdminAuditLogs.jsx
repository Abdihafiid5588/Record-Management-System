import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../utils/auth';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    user_id: '',
    action: ''
  });

  useEffect(() => {
    fetchAuditLogs();
    fetchAuditStats();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      const token = getAuthToken();
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`http://localhost:5000/api/admin/audit-log?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditStats = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('http://localhost:5000/api/admin/audit-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-600 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="number"
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Filter by user ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Filter by action"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Items per page</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">Top Users</h3>
            {stats.activeUsers.map((user, index) => (
              <div key={user.id} className="flex justify-between py-1 border-b">
                <span>{user.username}</span>
                <span className="text-blue-600">{user.action_count} actions</span>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">Common Actions</h3>
            {stats.commonActions.map((action, index) => (
              <div key={index} className="flex justify-between py-1 border-b">
                <span>{action.action}</span>
                <span className="text-green-600">{action.count}</span>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">Recent Activity</h3>
            {stats.timeline.slice(0, 5).map((day, index) => (
              <div key={index} className="flex justify-between py-1 border-b">
                <span>{new Date(day.date).toLocaleDateString()}</span>
                <span className="text-purple-600">{day.actions_count} actions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record Affected</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.logs?.map((log) => {
                let details = {};
                try {
                  details = JSON.parse(log.details);
                } catch (e) {
                  console.error('Failed to parse log details:', e);
                }
                
                return (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.user_username ? (
                        <div>
                          <div className="font-medium">{log.user_username}</div>
                          <div className="text-sm text-gray-500">{log.user_email}</div>
                        </div>
                      ) : (
                        'Unknown User'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {details.recordId ? (
                        <div>
                          <div className="font-medium">ID: {details.recordId}</div>
                          {details.requestData && details.requestData.fullName && (
                            <div className="text-sm text-gray-500">Name: {details.requestData.fullName}</div>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => alert(JSON.stringify(details, null, 2))}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-100 border-t">
            <div className="flex justify-between items-center">
              <span>Page {filters.page} of {logs.totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  disabled={filters.page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  disabled={filters.page === logs.totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;