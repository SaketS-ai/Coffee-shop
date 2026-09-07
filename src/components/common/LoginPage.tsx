import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoginScreen } from './LoginScreen';
import { homePathForRole } from '../../routes/roleHome';

// The one shared /login route for every role (MEMBER/BARISTA/ADMIN) - reuses
// the existing LoginScreen form/AuthContext session as-is, and just adds the
// post-login redirect: once `user` is populated, CHECK ROLE and send them to
// their own surface.
export const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(homePathForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center py-10">
      <LoginScreen isOpen onClose={() => navigate('/app')} />
    </div>
  );
};
