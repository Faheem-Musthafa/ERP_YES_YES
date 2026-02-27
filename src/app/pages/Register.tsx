import React from 'react';
import { Navigate } from 'react-router';

// Self-registration removed — accounts are created by admins only.
export const Register = () => <Navigate to="/login" replace />;
