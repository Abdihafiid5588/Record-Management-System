import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

   const triggerRateLimit = (retryAfter) => {
    setRateLimited(true);
    setRemainingTime(parseInt(retryAfter));

    const countdown = setInterval(() => {
      setRemainingTime(prev => {
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

  setIsLoading(true);
  setMessage('');

  try {
    const response = await fetch('${API_URL}/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    // Handle server rate limit (429)
    if (response.status === 429) {
      triggerRateLimit(response.headers.get('Retry-After') || 900);
      setMessage(data.error || 'Too many login attempts. Please try again later.');
      return;
    }

    if (response.ok) {
      // Reset failed attempts after successful login
      setFailedAttempts(0);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);

      if (data.user.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Count failed attempts
      setFailedAttempts(prev => {
        const newCount = prev + 1;
        if (newCount >= 5) {
          triggerRateLimit(60); // lock out for 60 seconds
        }
        return newCount;
      });
      setMessage(data.error || 'Invalid credentials');
    }
  } catch (error) {
    // If backend silently drops due to rate limit → handle as local lockout
    setFailedAttempts(prev => {
      if (prev >= 5) {
        triggerRateLimit(60); // fallback lockout
        return prev;
      }
      return prev;
    });
    setMessage('Too many login attempts. Please try again later.');
  } finally {
    setIsLoading(false);
  }
};

// Helper to trigger countdown


  // Format time in minutes and seconds
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
              disabled={rateLimited || isLoading}
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
              disabled={rateLimited || isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || rateLimited}
            className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
              rateLimited 
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
            ) : 'Sign In'}
          </button>
        </form>
        
        {message && (
          <div className={`mt-6 p-3 rounded-lg text-center ${
            message.includes('successful') 
              ? 'bg-green-100 text-green-700' 
              : message.includes('Too many') 
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