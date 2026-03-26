import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('user_email') || 'Signed in user';

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-shell-navbar">
        <div className="app-shell-logo">
          Optimal<span className="logo-accent">AI</span>
        </div>
        <div className="app-shell-user">
          <span className="app-shell-user-email">{userEmail}</span>
          <button className="app-shell-signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <aside className="app-shell-sidebar">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `app-shell-nav-link${isActive ? ' active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/analysis/new"
          className={({ isActive }) => `app-shell-nav-link${isActive ? ' active' : ''}`}
        >
          New Analysis
        </NavLink>
      </aside>

      <main className="app-shell-main">
        <Outlet />
      </main>
    </div>
  );
};
