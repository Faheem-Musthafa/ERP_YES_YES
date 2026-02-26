import React from 'react';

export const WaitingApproval = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
      <h1 className="text-2xl font-bold text-[#1e3a8a] mb-4">Awaiting Approval</h1>
      <p className="text-gray-600 mb-4">Your registration is submitted and pending admin approval.<br />You will be notified once your account is activated.</p>
    </div>
  </div>
);
