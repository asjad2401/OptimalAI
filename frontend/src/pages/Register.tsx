import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { AUTH_ENDPOINTS } from '../config';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const validatePassword = (password: string) => {
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter";
    if (!/\d/.test(password)) return "Password must contain at least one number";
    if (!/[@$!%*?&#^_\-]/.test(password)) return "Password must contain at least one special character (@$!%*?&#^_-)";
    if (!/^[A-Za-z\d@$!%*?&#^_\-]+$/.test(password)) return "Password contains invalid characters";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(AUTH_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, full_name: name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Registration failed. Please try again.');
        return;
      }

      // Instead of forcing them to log in immediately, some APIs return token on register,
      // but OptimalAI's register only returns UserResponse. So we will just auto-login.
      
      const loginResponse = await fetch(AUTH_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        localStorage.setItem('access_token', loginData.access_token);
        console.log('Registration and Login successful');
        navigate('/dashboard');
      } else {
        // If auto-login fails, redirect to login
        navigate('/login');
      }

    } catch (err) {
      setError('Network error. Please try again later.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-form-header">
        <div className="auth-form-subtitle">CREATE ACCOUNT</div>
        <h2 className="auth-form-title">Join OptimalAI</h2>
      </div>
      
      <div className="auth-form-divider"></div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            className="form-input"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="error-bar">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <div className="form-footer-divider">
        <span>or</span>
      </div>

      <div className="form-footer-text">
        Already have an account? <Link to="/login" className="form-footer-link">Sign In</Link>
      </div>
    </AuthLayout>
  );
};
