import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MdDashboard,
  MdPerson, 
  MdAddCircle, 
  MdLibraryBooks, 
  MdSearch,
  MdSettings, 
  MdExitToApp,
  MdAdminPanelSettings,
  MdPeople,
  MdAudiotrack
} from 'react-icons/md';

const Sidebar = ({ onLogout, user, isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState(location.pathname);

  const handleNavigation = (path) => {
    setActiveItem(path);
    navigate(path);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  const mainNavItems = [
    { text: 'Dashboard', icon: <MdDashboard className="text-xl" />, path: '/dashboard' },
    { text: 'Add Record', icon: <MdAddCircle className="text-xl" />, path: '/add-record' },
    { text: 'Records List', icon: <MdLibraryBooks className="text-xl" />, path: '/records-list' },
    { text: 'Search Records', icon: <MdSearch className="text-xl" />, path: '/search-records' },
  ];

  const adminNavItems = [
    { text: 'Admin Dashboard', icon: <MdAdminPanelSettings className="text-xl" />, path: '/admin' },
    { text: 'User Management', icon: <MdPeople className="text-xl" />, path: '/admin/users' },
    { text: 'Audit Logs', icon: <MdAudiotrack className="text-xl" />, path: '/admin/audit-logs' },
  ];

  const accountNavItems = [
    { text: 'Settings', icon: <MdSettings className="text-xl" />, path: '/settings' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl flex flex-col">
      {/* Logo/Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
            <MdPerson className="text-xl text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold truncate">Waaxda Sahanka <br /> Iyo Sirdoonka T.C.DH.XDS</h1>
            <p className="text-xs text-blue-200 truncate">
              {user?.email || user?.username}
              {isAdmin && ' • Admin'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4">
          <p className="text-xs font-semibold uppercase text-blue-200 mb-3">Main Navigation</p>
        </div>
        
        <nav className="px-4">
          {mainNavItems.map((item) => (
            <div key={item.text} className="mb-1">
              <button
                onClick={() => handleNavigation(item.path)}
                className={`flex w-full items-center rounded-xl px-3 py-3 transition-all duration-200 ${
                  activeItem === item.path 
                    ? 'bg-white/20 text-white' 
                    : 'bg-transparent text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="mr-3 flex w-6 items-center justify-center">
                  {item.icon}
                </span>
                <span className={`flex-grow text-left ${
                  activeItem === item.path ? 'font-semibold' : 'font-medium'
                }`}>
                  {item.text}
                </span>
                {activeItem === item.path && (
                  <div className="h-6 w-1 rounded-full bg-white"></div>
                )}
              </button>
            </div>
          ))}
        </nav>

        {/* Admin Navigation (only show if user is admin) */}
        {isAdmin && (
          <>
            <div className="px-4 mt-6">
              <p className="text-xs font-semibold uppercase text-blue-200 mb-3">Administration</p>
            </div>
            
            <nav className="px-4">
              {adminNavItems.map((item) => (
                <div key={item.text} className="mb-1">
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`flex w-full items-center rounded-xl px-3 py-3 transition-all duration-200 ${
                      activeItem === item.path 
                        ? 'bg-white/20 text-white' 
                        : 'bg-transparent text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="mr-3 flex w-6 items-center justify-center">
                      {item.icon}
                    </span>
                    <span className={`flex-grow text-left ${
                      activeItem === item.path ? 'font-semibold' : 'font-medium'
                    }`}>
                      {item.text}
                    </span>
                    {activeItem === item.path && (
                      <div className="h-6 w-1 rounded-full bg-white"></div>
                    )}
                  </button>
                </div>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Account Navigation - Fixed at bottom */}
      <div className="mt-auto border-t border-blue-600/30 mx-4"></div>
      
      <div className="px-4 py-4">
        <p className="text-xs font-semibold uppercase text-blue-200 mb-3">Account</p>
        
        <nav className="space-y-1">
          {accountNavItems.map((item) => (
            <div key={item.text}>
              <button
                onClick={() => handleNavigation(item.path)}
                className={`flex w-full items-center rounded-xl px-3 py-3 transition-all duration-200 ${
                  activeItem === item.path 
                    ? 'bg-white/20 text-white' 
                    : 'bg-transparent text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="mr-3 flex w-6 items-center justify-center">
                  {item.icon}
                </span>
                <span className={`flex-grow text-left ${
                  activeItem === item.path ? 'font-semibold' : 'font-medium'
                }`}>
                  {item.text}
                </span>
              </button>
            </div>
          ))}
          
          {/* Logout Button */}
          <div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-xl px-3 py-3 transition-all duration-200 bg-transparent text-red-100 hover:bg-red-500/20 hover:text-red-50"
            >
              <span className="mr-3 flex w-6 items-center justify-center">
                <MdExitToApp className="text-xl" />
              </span>
              <span className="flex-grow text-left font-medium">
                Logout
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;