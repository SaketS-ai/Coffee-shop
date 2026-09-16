import React from 'react';
import { UnifiedAuthPage } from '@shared/components/auth/UnifiedAuthPage';

export const OperationsLoginPage: React.FC = () => {
  return <UnifiedAuthPage initialRole="admin" isOperationsApp={true} />;
};

export default OperationsLoginPage;
