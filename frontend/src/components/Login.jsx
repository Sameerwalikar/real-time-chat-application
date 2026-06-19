import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';

export default function Login({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = {
        username: formData.username,
        password: formData.password,
      };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Authentication failed');
      } else {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left: Form Section */}
      <div className="login-form-section">
        <div className="login-form-wrapper">
          <h1 className="login-title">{isLogin ? 'Welcome back' : 'Create account'}</h1>
          <p className="login-subtitle">
            {isLogin
              ? 'Sign in to your account to continue'
              : "Let's get started with your 30 days trial"}
          </p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      id="name"
                      type="text"
                      name="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Choose username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create account'}
            </button>
          </form>

          {/* Social Login */}
          <div className="social-divider">Or continue with</div>

          <div className="social-logins">
            <button className="social-btn google" title="Google" type="button">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button className="social-btn apple" title="Apple" type="button">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 384 512"
    width="20"
    height="20"
    fill="currentColor"
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.5 50.1-84.9-18.9-27-47.4-41.9-85.1-44.9-35.7-2.8-74.7 20.8-89 20.8-15.1 0-49.6-19.8-76.8-19.8C61.6 140 0 196.4 0 302.3c0 31.3 5.7 63.7 17.1 97.1 15.2 44.2 70.1 152.4 127.4 150.6 29.9-.7 51.1-21.3 90-21.3 37.7 0 57.4 21.3 90.7 21.3 57.8-.8 107.4-99.2 121.9-143.5-83.4-39.3-78.4-132.2-78.4-137.8zM259.3 0c0 29-10.6 55.8-31.7 80.4-25.4 29.1-56.1 45.9-89.4 43.2-4.2-32.4 9.4-66.8 32.7-91.9C194.5 6.8 227.7-1.7 259.3 0z" />
  </svg>
</button>
          
            <button className="social-btn facebook" title="Facebook" type="button">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>

          <p className="login-toggle">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ name: '', email: '', username: '', password: '' });
              }}
              className="login-toggle-btn"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>

      {/* Right: Illustration Section */}
      <div className="login-visual-section">
        <svg viewBox="0 0 400 600" className="illustration-svg" xmlns="http://www.w3.org/2000/svg">
          {/* Gradient Background */}
          <defs>
            <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#708ab8" />
              <stop offset="30%" stopColor="#9cb468" />
              <stop offset="60%" stopColor="#729d56" />
              <stop offset="100%" stopColor="#a1d2cb" />
            </linearGradient>
          </defs>

          {/* Sky background */}
          <rect width="400" height="600" fill="url(#skyGradient)" />

          {/* Sun */}
          <circle cx="320" cy="100" r="50" fill="#FFF9E6" opacity="0.95" />

          {/* Mountains */}
          <path d="M 0 350 Q 100 280 200 320 T 400 350 L 400 600 L 0 600 Z" fill="#2C1B47" opacity="0.8" />
          <path d="M 0 420 Q 100 380 200 410 T 400 420 L 400 600 L 0 600 Z" fill="#4A3F6B" opacity="0.6" />

          {/* Water */}
          <ellipse cx="200" cy="480" rx="180" ry="50" fill="#a1b45c" opacity="0.7" />

          {/* Trees */}
          <rect x="80" y="380" width="8" height="80" fill="#1a1a2e" />
          <path d="M 84 340 L 60 380 L 108 380 Z" fill="#007306" />
          
          <rect x="180" y="400" width="6" height="70" fill="#1a1a2e" />
          <path d="M 183 360 L 163 400 L 203 400 Z" fill="#007306" />
          
          <rect x="280" y="390" width="7" height="75" fill="#1a1a2e" />
          <path d="M 283.5 345 L 262 390 L 305 390 Z" fill="#007306" />
        </svg>
      </div>
    </div>
  );
}
