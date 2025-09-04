import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AddRecord from './pages/AddRecord';
import RecordsList from './pages/RecordsList';
import ViewRecord from './components/ViewRecord';
import EditRecord from './components/EditRecord';
import SearchRecords from './pages/SearchRecords';
import Login from './pages/Login';
import UserSettings from './pages/settings';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AdminAuditLogs from './pages/AdminAuditLogs';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on initial load
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Check if user is admin
  const isAdmin = user?.isAdmin === true;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      {user ? (
        <div className="flex">
          <Sidebar onLogout={handleLogout} user={user} isAdmin={isAdmin} />
          <div className="flex-1 ml-64 min-h-screen bg-gray-100">
            <Routes>
              <Route path="/" element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add-record" element={<AddRecord />} />
              <Route path="/records-list" element={<RecordsList />} />
              <Route path="/record/:id" element={<ViewRecord />} />
              <Route path="/edit-record/:id" element={<EditRecord />} />
              <Route path="/search-records" element={<SearchRecords />} />
              <Route path="/settings" element={<UserSettings />} />
              
              {/* Admin-only routes */}
              {isAdmin && (
                <>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                </>
              )}
              
              {/* Redirect any unknown routes */}
              <Route path="*" element={<Navigate to={isAdmin ? "/admin" : "/dashboard"} />} />
            </Routes>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}