import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [apiStatus, setApiStatus] = useState('checking'); // checking, online, offline
  const navigate = useNavigate();

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (response.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      setApiStatus('offline');
      console.error('API health check failed:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const triggerRateLimit = (retryAfter) => {
    setRateLimited(true);
    setRemainingTime(parseInt(retryAfter, 10) || 60);

    const countdown = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          setRateLimited(false);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rateLimited) {
      setMessage(`Too many attempts. Please try again in ${remainingTime} seconds.`);
      return;
    }

    if (apiStatus === 'offline') {
      setMessage('API server is offline. Please try again later.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Try both possible API endpoint patterns
      let apiUrl = `${API_URL}/api/auth/login`;
      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      // If first attempt fails, try alternative pattern
      if (response.status === 404) {
        apiUrl = API_URL.endsWith('/api') 
          ? `${API_URL}/auth/login` 
          : `${API_URL}/api/auth/login`;
        
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      // Handle HTTP errors
      if (response.status === 500) {
        setMessage('Internal server error. Please try again later or contact support.');
        setIsLoading(false);
        return;
      }

      // Handle 429 Too Many Requests
      if (response.status === 429) {
        triggerRateLimit(response.headers.get('Retry-After') || 600);
        setMessage('Too many login attempts. Please try again later.');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setFailedAttempts(0);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);

        navigate(data.user.isAdmin ? '/admin' : '/dashboard');
      } else {
        setFailedAttempts((prev) => {
          const newCount = prev + 1;
          if (newCount >= 5) triggerRateLimit(60);
          return newCount;
        });
        setMessage(data.error || 'Invalid credentials');
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setMessage('Network error: Please check your connection and try again.');
        setApiStatus('offline');
      } else {
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Government Records System</h1>
          <p className="text-gray-600">Sign in to access the dashboard</p>
          
          {/* API Status Indicator */}
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            apiStatus === 'online' ? 'bg-green-100 text-green-800' : 
            apiStatus === 'offline' ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {apiStatus === 'online' ? 'API Online' : 
             apiStatus === 'offline' ? 'API Offline' : 
             'Checking API Status'}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Enter your email"
              required
              disabled={rateLimited || isLoading || apiStatus === 'offline'}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Enter your password"
              required
              disabled={rateLimited || isLoading || apiStatus === 'offline'}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || rateLimited || apiStatus === 'offline'}
            className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
              rateLimited || apiStatus === 'offline'
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : rateLimited ? (
              `Try again in ${formatTime(remainingTime)}`
            ) : apiStatus === 'offline' ? (
              'API Offline - Cannot Login'
            ) : 'Sign In'}
          </button>
        </form>
        
        {message && (
          <div className={`mt-6 p-3 rounded-lg text-center ${
            message.includes('successful') 
              ? 'bg-green-100 text-green-700' 
              : message.includes('Too many') || message.includes('try again later')
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-red-100 text-red-700'
          }`}>
            {message}
            {rateLimited && (
              <div className="mt-2 text-sm">
                You can try again in {formatTime(remainingTime)}
              </div>
            )}
          </div>
        )}
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Hint:</p>
          <p className="mt-1">admin@government.gov</p>
        </div>
      </div>
    </div>
  );
};

export default Login;