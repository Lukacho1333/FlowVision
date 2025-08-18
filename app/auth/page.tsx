'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const [email, setEmail] = useState('david.morrison@morrisonae.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  // Demo users from Morrison A&E
  const demoUsers = [
    {
      email: 'david.morrison@morrisonae.com',
      name: 'David Morrison',
      role: 'Principal/CEO',
      description: 'Strategic oversight and executive decision-making',
    },
    {
      email: 'sarah.chen@morrisonae.com',
      name: 'Sarah Chen',
      role: 'Design Director',
      description: 'Creative leadership and design process management',
    },
    {
      email: 'mike.rodriguez@morrisonae.com',
      name: 'Mike Rodriguez',
      role: 'Project Director',
      description: 'Operations delivery and project coordination',
    },
    {
      email: 'jennifer.kim@morrisonae.com',
      name: 'Jennifer Kim',
      role: 'Business Development Director',
      description: 'Growth strategy and client relationship management',
    },
    {
      email: 'alex.thompson@morrisonae.com',
      name: 'Alex Thompson',
      role: 'Engineering Director',
      description: 'Technical systems and compliance oversight',
    },
  ];

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Admin123!');
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (res?.error) {
        setError('Invalid email or password');
      } else if (res?.ok) {
        // Successful login - redirect manually
        router.push('/');
      }
    } catch (err) {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/logo-flowvision.svg" alt="FlowVision" className="h-12 w-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Morrison Architecture & Engineering</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          FlowVision Demo Environment - Architecture Firm Operations Intelligence
        </p>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-center text-xs text-blue-700 font-medium">
            🏗️ DEMO ENVIRONMENT: Morrison AE - 75+ Employee Architecture Firm
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to FlowVision?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/auth/register"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
              >
                Create New Account
              </Link>
            </div>
          </div>

          {/* Morrison A&E Demo Team */}
          <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-blue-900">Morrison A&E Demo Team</h4>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Click to login
              </span>
            </div>
            <div className="space-y-2">
              {demoUsers.map((user) => (
                <button
                  key={user.email}
                  onClick={() => handleDemoLogin(user.email)}
                  className="w-full text-left p-3 bg-white border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm group-hover:text-blue-900">
                        {user.name}
                      </div>
                      <div className="text-xs text-blue-700 font-medium mt-0.5">{user.role}</div>
                      <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {user.description}
                      </div>
                    </div>
                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-600 text-center">
                All demo accounts use password:{' '}
                <span className="font-mono bg-blue-100 px-1 rounded">Admin123!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
