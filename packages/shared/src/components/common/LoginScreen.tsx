import React from 'react';
import { AuthCard } from '../auth/AuthCard';

interface LoginScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#241A16]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="relative my-auto w-full max-w-[390px] sm:max-w-[420px]">
        <AuthCard
          onDismiss={onClose}
          showDismiss={true}
          initialMode={initialMode}
          hideProfileSelector={true}
        />
      </div>
    </div>
  );
};
