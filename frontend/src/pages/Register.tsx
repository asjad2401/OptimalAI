import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AUTH_ENDPOINTS } from '../config';
import { validateEmail, validatePassword } from '../utils/validation';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return setError('Full name is required.');
    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    const passwordError = validatePassword(password);
    if (passwordError) return setError(passwordError);

    setError('');
    setLoading(true);

    try {
      const registerRes = await fetch(AUTH_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, password }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) return setError(registerData.detail || 'Registration failed.');

      const loginRes = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        localStorage.setItem('access_token', loginData.access_token);
        localStorage.setItem('user_email', email);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-form-header">
        <div className="auth-form-subtitle">CREATE ACCOUNT</div>
        <h2 className="auth-form-title">Join OptimalAI</h2>
      </div>

      <div className="auth-form-divider" />

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            type="text"
            className="form-input"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-bar">{error}</div>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="form-footer-divider"><span>or</span></div>

      <div className="form-footer-text">
        Already have an account?{' '}
        <Link to="/login" className="form-footer-link">Sign In</Link>
      </div>
    </AuthLayout>
  );
};
