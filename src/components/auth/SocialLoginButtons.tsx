import React, { useState } from 'react';

export const SocialLoginButtons: React.FC = () => {
  const [notice, setNotice] = useState<string | null>(null);

  const handleSocialClick = (provider: string) => {
    setNotice(`${provider} sign-in is coming soon! Please use your email and password.`);
    setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  return (
    <div className="space-y-3.5 pt-1">
      {/* "────── or ──────" Divider */}
      <div className="flex items-center space-x-3 text-xs text-[#DDD4C8]/60">
        <div className="flex-1 h-px bg-[#DDD4C8]/25" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#DDD4C8]/70 select-none">
          or
        </span>
        <div className="flex-1 h-px bg-[#DDD4C8]/25" />
      </div>

      {/* Social Brand Circular Buttons */}
      <div className="flex items-center justify-center space-x-4">
        {/* Facebook */}
        <button
          type="button"
          onClick={() => handleSocialClick('Facebook')}
          aria-label="Sign in with Facebook"
          title="Sign in with Facebook"
          className="w-10 h-10 rounded-full bg-[#241A16]/50 hover:bg-[#241A16] border border-[#DDD4C8]/20 flex items-center justify-center text-[#FBF8F2] transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </button>

        {/* Google */}
        <button
          type="button"
          onClick={() => handleSocialClick('Google')}
          aria-label="Sign in with Google"
          title="Sign in with Google"
          className="w-10 h-10 rounded-full bg-[#241A16]/50 hover:bg-[#241A16] border border-[#DDD4C8]/20 flex items-center justify-center text-[#FBF8F2] transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285v3.608h5.105c-.22 1.433-1.667 4.2-5.105 4.2-3.076 0-5.586-2.546-5.586-5.693s2.51-5.693 5.586-5.693c1.752 0 2.923.748 3.593 1.39l2.857-2.753C16.89 3.57 14.772 2.7 12.24 2.7 6.942 2.7 2.667 6.975 2.667 12.273s4.275 9.573 9.573 9.573c5.534 0 9.208-3.89 9.208-9.37 0-.63-.068-1.11-.15-1.587H12.24z" />
          </svg>
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={() => handleSocialClick('Apple')}
          aria-label="Sign in with Apple"
          title="Sign in with Apple"
          className="w-10 h-10 rounded-full bg-[#241A16]/50 hover:bg-[#241A16] border border-[#DDD4C8]/20 flex items-center justify-center text-[#FBF8F2] transition-all hover:scale-105 active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.78c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.71-.93 2.73 1.01.08 2.03-.49 2.63-1.23z" />
          </svg>
        </button>
      </div>

      {notice && (
        <div className="bg-[#241A16]/80 border border-[#B98252]/40 text-[#FBF8F2] text-[11px] p-2 rounded-xl text-center animate-fade-in">
          {notice}
        </div>
      )}
    </div>
  );
};
