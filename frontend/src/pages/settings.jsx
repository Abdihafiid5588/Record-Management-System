import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserSettings = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: ''
  });

  const [avatar, setAvatar] = useState(null);       // data URL or absolute server URL
  const [localPreview, setLocalPreview] = useState(null); // selected file preview (data URL)
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL || '';

  // helper: remove trailing /api so we can build file URLs reliably
  const baseForFiles = API_URL.replace(/\/api\/?$/, '');

  // Function to get auth token
  const getAuthToken = () => localStorage.getItem('token');

  // Handle unauthorized
  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Fetch user data (named so we can call after save)
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        handleUnauthorized();
        return;
      }

      const res = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await res.json();
      setUserData({
        username: data.username || '',
        email: data.email || ''
      });

      // Build avatar absolute URL if provided by server
      if (data.avatar_url) {
        const absolute =
          data.avatar_url.startsWith('http')
            ? data.avatar_url
            : `${baseForFiles}${data.avatar_url.startsWith('/') ? '' : '/'}${data.avatar_url}`;
        setAvatar(absolute);
        setLocalPreview(null); // clear local preview if server has avatar
      } else {
        setAvatar(null);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // preview with FileReader
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLocalPreview(ev.target.result); // show local preview immediately
      setAvatar(ev.target.result); // show preview in avatar slot
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');

    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      const formData = new FormData();
      formData.append('username', userData.username);
      formData.append('email', userData.email);

      // Append avatar file if selected
      if (fileInputRef.current && fileInputRef.current.files[0]) {
        formData.append('avatar', fileInputRef.current.files[0]);
      }

      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // If backend returns avatar_url, build absolute URL and set it.
      if (result.avatar_url) {
        const absolute =
          result.avatar_url.startsWith('http')
            ? result.avatar_url
            : `${baseForFiles}${result.avatar_url.startsWith('/') ? '' : '/'}${result.avatar_url}`;
        setAvatar(absolute);
        setLocalPreview(null);
      } else {
        // re-fetch profile to ensure we get latest data (safe fallback)
        await fetchUserData();
      }

      setSaveStatus('Profile updated successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // initials fallback from username
  const getInitials = () => {
    const name = userData.username || '';
    if (!name) return 'U';
    const parts = name.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return name.slice(0, 1).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Profile Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account information</p>
            </div>

            {saveStatus && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg">
                {saveStatus}
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Profile card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                    {avatar ? (
                      // If avatar is data URL or server URL we just show it
                      <img
                        src={avatar}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white"
                      />
                    ) : (
                      getInitials()
                    )}
                  </div>

                  <button
                    onClick={triggerFileInput}
                    className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-md transition-colors"
                    type="button"
                    aria-label="Upload avatar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <h2 className="text-xl font-semibold text-gray-800 text-center">{userData.username}</h2>
                <p className="text-gray-500 text-sm text-center mt-2">{userData.email}</p>
              </div>
            </div>
          </div>

          {/* Right column - Settings form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={userData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={userData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className={`bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-300 flex items-center shadow-md hover:shadow-lg ${
                  saving ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
