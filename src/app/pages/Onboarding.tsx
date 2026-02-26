import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';

export const Onboarding = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-[#1e3a8a] mb-4">Welcome to YES YES MARKETING ERP</h1>
        <p className="text-gray-600 mb-8">Please select your action to continue.</p>
        <div className="flex flex-col gap-4">
          <Button className="w-full" onClick={() => navigate('/register')}>Register as New User</Button>
          <Button className="w-full" onClick={() => navigate('/login')}>Login</Button>
        </div>
      </div>
    </div>
  );
};
