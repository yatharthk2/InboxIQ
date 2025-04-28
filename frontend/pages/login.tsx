import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Button from '@/components/Button';
import Navbar from '@/components/Navbar';
import { FiMail, FiLock } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Here you would typically make an API call to authenticate
    // For now, we'll just simulate a delay
    setTimeout(() => {
      setIsLoading(false);
      // Redirect or handle successful login
      alert('Login functionality will be implemented soon!');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />

      <div className="container-custom mx-auto px-4 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto bg-dark-card p-8 rounded-xl shadow-lg border border-dark-border"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to continue to InboxIQ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiMail />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-black border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiLock />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-black border border-dark-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="text-primary hover:text-primary-dark">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              onClick={handleSubmit}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:text-primary-dark">
                Sign up
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
