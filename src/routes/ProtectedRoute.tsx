import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homePathForRole } from './roleHome';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

// Real route-level protection: an unauthenticated visitor is sent to
// /login, and a signed-in user whose role isn't allowed here is sent to
// their own role's home - never just left on this URL with the page
// content swapped out for a "denied" message.
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#8C5A3C]/30 border-t-[#8C5A3C] animate-spin" />
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <>{children}</>;
};
