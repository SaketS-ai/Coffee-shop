import React from 'react';
import { UnifiedAuthPage } from '../auth/UnifiedAuthPage';

export const LoginPage: React.FC = () => {
  return <UnifiedAuthPage initialRole="member" isOperationsApp={false} />;
};

export default LoginPage;
