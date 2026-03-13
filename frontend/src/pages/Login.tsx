import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AUTH_ENDPOINTS } from '../config';
import { validateEmail } from '../utils/validation';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    if (!password) return setError('Password is required.');

    setError('');
    setLoading(true);

    try {
      const res = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) return setError(data.detail || 'Login failed. Please try again.');

      localStorage.setItem('access_token', data.access_token);
      navigate('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-form-header">
        <div className="auth-form-subtitle">ACCOUNT ACCESS</div>
        <h2 className="auth-form-title">Welcome back</h2>
      </div>

      <div className="auth-form-divider" />

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="login-password">Password</label>
            <Link to="#" className="forgot-password-link">Forgot password?</Link>
          </div>
          <input
            id="login-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-bar">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="form-footer-divider"><span>or</span></div>

      <div className="form-footer-text">
        Don't have an account?{' '}
        <Link to="/register" className="form-footer-link">Register</Link>
      </div>
    </AuthLayout>
  );
};
