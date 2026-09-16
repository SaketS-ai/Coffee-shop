import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthHeaderImage } from './AuthHeaderImage';
import { AuthTabs } from './AuthTabs';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { SocialLoginButtons } from './SocialLoginButtons';
import { ArrowLeft } from 'lucide-react';

interface AuthCardProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
  initialMode?: 'login' | 'register';
  isEmbedded?: boolean;
  hideProfileSelector?: boolean;
  showHeroImage?: boolean;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onDismiss,
  showDismiss = false,
  initialMode = 'login',
  isEmbedded = false,
  showHeroImage,
}) => {
  const { login, register } = useAuth();
  const [formMode, setFormMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSignIn = async (email: string, pass: string) => {
    setIsSubmitting(true);
    setApiError(null);

    const result = await login(email, pass);
    setIsSubmitting(false);

    if (!result.success) {
      setApiError(result.error || 'Invalid email or password. Please verify your credentials.');
      return;
    }

    if (onDismiss) {
      onDismiss();
    }
  };

  const handleSignUp = async (name: string, email: string, pass: string) => {
    setIsSubmitting(true);
    setApiError(null);

    const result = await register(name, email, pass);
    setIsSubmitting(false);

    if (!result.success) {
      setApiError(result.error || 'Failed to create account. Please check your details.');
      return;
    }

    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={`w-full flex flex-col transition-all duration-300 ${
        isEmbedded
          ? 'bg-transparent text-[#FBF8F2]'
          : 'max-w-[420px] rounded-[36px] sm:rounded-[40px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(36,26,22,0.4)] border border-[#3A2922]/30 bg-[#6B4A3A]'
      }`}
    >
      {/* 1. TOP COFFEE HERO IMAGE */}
      {showHeroImage === false ? null : showHeroImage === true || !isEmbedded ? (
        <AuthHeaderImage onDismiss={onDismiss} showDismiss={showDismiss} />
      ) : (
        <div className="md:hidden -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-4">
          <AuthHeaderImage onDismiss={onDismiss} showDismiss={showDismiss} />
        </div>
      )}

      {/* 2. AUTHENTICATION PANEL */}
      <div className={`${isEmbedded ? 'p-0' : 'p-6 sm:p-7 bg-[#6B4A3A]'} space-y-5 text-[#FBF8F2] flex-1 flex flex-col justify-between`}>
        <div className="space-y-4">
          <div>
            {formMode === 'forgot' ? (
              <div className="flex items-center space-x-2 border-b border-[#DDD4C8]/15 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setApiError(null);
                    setFormMode('login');
                  }}
                  className="p-1 rounded-lg text-[#DDD4C8]/70 hover:text-white hover:bg-white/10"
                  title="Back to Sign In"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono uppercase tracking-wider text-[#DDD4C8]/80 font-bold">
                  Member Account Recovery
                </span>
              </div>
            ) : (
              <AuthTabs
                activeTab={formMode}
                onTabChange={(tab) => {
                  setApiError(null);
                  setFormMode(tab);
                }}
              />
            )}
          </div>

          <div className="pt-1">
            {formMode === 'login' && (
              <SignInForm
                onSubmit={handleSignIn}
                onForgotPassword={() => {
                  setApiError(null);
                  setFormMode('forgot');
                }}
                isSubmitting={isSubmitting}
                error={apiError}
              />
            )}

            {formMode === 'register' && (
              <SignUpForm
                onSubmit={handleSignUp}
                isSubmitting={isSubmitting}
                error={apiError}
              />
            )}

            {formMode === 'forgot' && (
              <ForgotPasswordForm
                onBackToSignIn={() => {
                  setApiError(null);
                  setFormMode('login');
                }}
              />
            )}
          </div>
        </div>

        {/* Bottom Social Login: Strictly for Member */}
        {formMode !== 'forgot' && (
          <div className="pt-2">
            <SocialLoginButtons />
          </div>
        )}
      </div>
    </div>
  );
};
