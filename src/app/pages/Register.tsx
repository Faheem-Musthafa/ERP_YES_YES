import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        name,
        role: 'pending',
        approved: false,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#1e3a8a] mb-4">Register as New User</h1>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-green-600 text-sm bg-green-50 p-2 rounded">Registration successful! Awaiting admin approval.</div>}
          <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">Register</Button>
        </form>
        <div className="mt-4 text-sm text-gray-500">
          <Button variant="link" onClick={() => navigate('/login')}>Back to Login</Button>
        </div>
      </div>
    </div>
  );
};
