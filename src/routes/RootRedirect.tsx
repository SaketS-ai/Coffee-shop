import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homePathForRole } from './roleHome';

// LOGIN -> AUTHENTICATE -> GET CURRENT USER -> CHECK ROLE -> SHOW CORRECT APP.
// "/" itself renders nothing - it only ever forwards to the right surface,
// or to the public member app for a signed-out visitor.
export const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#8C5A3C]/30 border-t-[#8C5A3C] animate-spin" />
    </div>;
  }

  return <Navigate to={user ? homePathForRole(user.role) : '/app'} replace />;
};
