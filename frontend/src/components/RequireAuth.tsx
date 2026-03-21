import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};
