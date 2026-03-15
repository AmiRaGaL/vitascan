'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/useUser';

export function Navbar() {
  const { user, isGuest, loginWithGoogle, logout, loading } = useUser();

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <Link href="/" className="text-xl font-bold text-blue-600">
        VitaScan
      </Link>
      <div className="flex items-center gap-4">
        {loading ? null : isGuest ? (
          <button
            onClick={loginWithGoogle}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Login with Google
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:underline"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
