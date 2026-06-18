import { useState } from 'react';
import { MessageSquare } from 'lucide-react'; // Or MessageCircle

export default function Login({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
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

  const handleGuestLogin = async () => {
    if (!username.trim()) {
      setError('Please enter a username to join as Guest');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Guest login failed');
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
    <div className="auth-container">
      <div className="auth-top-bar"></div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <MessageSquare size={38} strokeWidth={2.5} />
            <span>WhatsApp Chat</span>
          </div>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Sign in to connect with friends in real-time' 
              : 'Create a secure account to join group or direct chats'}
          </p>
        </div>

        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Login
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Register
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">Username</label>
            <input
              className="auth-input"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sameer"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              className="auth-input"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-guest-divider">or join immediately as a guest</div>

        <button 
          className="auth-guest-btn" 
          type="button" 
          onClick={handleGuestLogin}
          disabled={loading}
        >
          Join as Guest
        </button>
      </div>
    </div>
  );
}
