import React from 'react';

interface AuthTabsProps {
  activeTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex items-center space-x-8 px-1 border-b border-[#DDD4C8]/15 pb-2">
      <button
        type="button"
        onClick={() => onTabChange('login')}
        className={`relative pb-1.5 text-base sm:text-lg font-bold transition-all ${
          activeTab === 'login'
            ? 'text-[#FBF8F2]'
            : 'text-[#DDD4C8]/60 hover:text-[#FBF8F2] font-medium'
        }`}
      >
        <span>Sign In</span>
        {activeTab === 'login' && (
          <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#FBF8F2] rounded-full shadow-xs transition-all duration-300" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onTabChange('register')}
        className={`relative pb-1.5 text-base sm:text-lg font-bold transition-all ${
          activeTab === 'register'
            ? 'text-[#FBF8F2]'
            : 'text-[#DDD4C8]/60 hover:text-[#FBF8F2] font-medium'
        }`}
      >
        <span>Sign Up</span>
        {activeTab === 'register' && (
          <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#FBF8F2] rounded-full shadow-xs transition-all duration-300" />
        )}
      </button>
    </div>
  );
};
