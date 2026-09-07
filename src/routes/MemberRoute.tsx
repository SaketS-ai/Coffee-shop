import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homePathForRole } from './roleHome';

interface MemberRouteProps {
  children: React.ReactNode;
}

// The member surface stays open to signed-out visitors (PRD 2.5 - browsing
// without an account), so unlike ProtectedRoute this never redirects to
// /login. It only bounces a BARISTA/ADMIN session away to their own surface,
// so a cafe or admin account can't end up on the consumer app.
export const MemberRoute: React.FC<MemberRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#8C5A3C]/30 border-t-[#8C5A3C] animate-spin" />
    </div>;
  }

  if (user && user.role !== 'MEMBER') {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <>{children}</>;
};
