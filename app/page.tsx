'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-lg text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="max-w-md text-center space-y-8 px-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Meal Tracker</h1>
          <p className="mt-4 text-lg text-zinc-600">
            Track your meals, monitor your nutrition, and achieve your health goals
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Get Started
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
