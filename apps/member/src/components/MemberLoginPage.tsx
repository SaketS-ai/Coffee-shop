import React from 'react';
import { UnifiedAuthPage } from '@shared/components/auth/UnifiedAuthPage';

export const MemberLoginPage: React.FC = () => {
  return <UnifiedAuthPage initialRole="member" isOperationsApp={false} fillParent />;
};

export default MemberLoginPage;
