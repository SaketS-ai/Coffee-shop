import React from 'react';
import { Navigate } from 'react-router-dom';

// Direct localhost / root requests to the Login Page so the user lands
// directly on the login screen with Member / Admin / Cafe User selection.
export const RootRedirect: React.FC = () => {
  return <Navigate to="/login" replace />;
};
