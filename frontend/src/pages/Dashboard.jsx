import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRecords: 0,
    todayRecords: 0,
    pendingRecords: 0,
    completedRecords: 0
  });
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Function to handle unauthorized access
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        
        if (!token) {
          handleUnauthorized();
          return;
        }

        // Fetch statistics
        const statsResponse = await fetch(`${API_URL}/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (statsResponse.status === 401) {
          handleUnauthorized();
          return;
        }
        
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch dashboard statistics');
        }
        
        const statsData = await statsResponse.json();
        setStats(statsData);
        
        // Fetch recent records (last 5 records)
        const recordsResponse = await fetch(`${API_URL}/records?page=1&limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (recordsResponse.status === 401) {
          handleUnauthorized();
          return;
        }
        
        if (!recordsResponse.ok) {
          throw new Error('Failed to fetch recent records');
        }
        
        const recordsData = await recordsResponse.json();
        setRecentRecords(recordsData.records);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleViewRecord = (id) => {
    navigate(`/record/${id}`);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Records Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Dhamaan Kiisaska</h2>
          <p className="text-4xl font-bold text-blue-600">{stats.totalRecords}</p>
        </div>
        
        {/* Records Today Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Kiisaska Maantay</h2>
          <p className="text-4xl font-bold text-green-600">{stats.todayRecords}</p>
        </div>
        
        {/* Pending Records Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Inta Horey Loo Soo Xiray</h2>
          <p className="text-4xl font-bold text-yellow-600">{stats.pendingRecords}</p>
        </div>
        
        {/* Completed Records Card */}
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Horey Looma Xirin intaan</h2>
          <p className="text-4xl font-bold text-purple-600">{stats.completedRecords}</p>
        </div>
      </div>
      
      {/* Recent Records Section */}
      <div className="mt-8 bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Records</h2>
          <button 
            onClick={() => navigate('/records-list')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </button>
        </div>
        
        {recentRecords.length === 0 ? (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-600 text-center py-8">No recent records to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tribe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.tribe || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewRecord(record.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
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