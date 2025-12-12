'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  autoLogoutOnLeave?: boolean;
}

export function ProtectedRoute({ children, autoLogoutOnLeave = false }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // パスキーログイン用のreturnUrlを付与
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // 自動ログアウト（ページ離脱時）
  useEffect(() => {
    if (!autoLogoutOnLeave || !isAuthenticated) return;

    const handleBeforeUnload = () => {
      // ページ離脱時にログアウト（同期的に実行）
      signOut();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autoLogoutOnLeave, isAuthenticated, signOut]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
