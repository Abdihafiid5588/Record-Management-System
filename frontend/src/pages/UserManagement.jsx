import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/api';
import { getAuthToken } from '../utils/auth';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false
  });
  const [createdUser, setCreatedUser] = useState(null);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const url = buildApiUrl('/api/admin/users');
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
        console.error('Failed to fetch users:', response.status, text);
        return;
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const url = buildApiUrl('/api/auth/register');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          isAdmin: newUser.isAdmin
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        alert(`Error: ${data.error || 'Failed to create user'}`);
        return;
      }

      setCreatedUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        isAdmin: newUser.isAdmin
      });
      setShowCredentials(true);
      setShowCreateModal(false);
      setNewUser({ username: '', email: '', password: '', isAdmin: false });
      fetchUsers();
      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const url = buildApiUrl(`/api/admin/users/${userId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to delete user'}`);
        return;
      }

      alert('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const url = buildApiUrl(`/api/admin/users/${editingUser.id}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editingUser.username,
          email: editingUser.email,
          isAdmin: editingUser.is_admin
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        alert(`Error: ${data.error || 'Failed to update user'}`);
        return;
      }

      alert('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    }
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Username: ${createdUser.username}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\nAdmin: ${createdUser.isAdmin ? 'Yes' : 'No'}`;
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          Create New User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.is_admin ? 'Yes' : 'No'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create, Credentials, Edit modals remain the same as your original UI */}
      {/* ... (I left modal markup unchanged; just wire up handlers above) */}
      {/* For brevity, I'm not re-pasting the entire modal markup — paste yours unchanged below these handlers. */}

      {/* Credentials Modal (example) */}
      {showCredentials && createdUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">User Created Successfully!</h2>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="mb-2"><span className="font-medium">Username:</span> {createdUser.username}</div>
              <div className="mb-2"><span className="font-medium">Email:</span> {createdUser.email}</div>
              <div className="mb-2"><span className="font-medium">Password:</span> {createdUser.password}</div>
              <div><span className="font-medium">Admin Access:</span> {createdUser.isAdmin ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={copyCredentials} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Copy Credentials</button>
              <button onClick={() => setShowCredentials(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
