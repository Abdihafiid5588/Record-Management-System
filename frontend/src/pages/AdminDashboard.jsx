import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../utils/api';
import { getAuthToken } from '../utils/auth';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecords: 0,
    todayRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const url = buildApiUrl('/api/admin/stats');
      console.log('Fetching admin stats from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to fetch admin stats:', response.status, text);
        return;
      }

      const data = await response.json();
      setStats({
        totalUsers: Number(data.totalUsers) || 0,
        totalRecords: Number(data.totalRecords) || 0,
        todayRecords: Number(data.todayRecords) || 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Users</h2>
          <p className="text-4xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Records</h2>
          <p className="text-4xl font-bold text-green-600">{stats.totalRecords}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Today's Records</h2>
          <p className="text-4xl font-bold text-purple-600">{stats.todayRecords}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            Manage Users
          </button>
          <button
            onClick={() => navigate('/add-record')}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            Add New Record
          </button>
          <button
            onClick={() => navigate('/records-list')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            View All Records
          </button>
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            View Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
