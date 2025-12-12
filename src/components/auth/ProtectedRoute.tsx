'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePasskeySession?: boolean;
}

const PASSKEY_SESSION_KEY = 'passkey_session_active';

export function ProtectedRoute({ children, requirePasskeySession = false }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const initialPathRef = useRef(pathname);

  // パスキーセッションチェック
  useEffect(() => {
    if (requirePasskeySession && typeof window !== 'undefined') {
      const hasSession = sessionStorage.getItem(PASSKEY_SESSION_KEY);
      if (!hasSession && isAuthenticated) {
        // パスキーセッションがない場合は再認証が必要
        signOut().then(() => {
          router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
        });
      } else if (isAuthenticated) {
        // セッションをセット
        sessionStorage.setItem(PASSKEY_SESSION_KEY, 'true');
      }
    }
  }, [requirePasskeySession, isAuthenticated, signOut, router, pathname]);

  // ページ遷移検知（pathname変更時にセッションクリア）
  useEffect(() => {
    if (requirePasskeySession && typeof window !== 'undefined') {
      // 初期パスから離れた場合
      if (pathname !== initialPathRef.current) {
        sessionStorage.removeItem(PASSKEY_SESSION_KEY);
      }
    }
  }, [pathname, requirePasskeySession]);

  // 未認証時のリダイレクト
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // ブラウザ閉じる/リロード時にセッションクリア
  useEffect(() => {
    if (!requirePasskeySession) return;

    const handleBeforeUnload = () => {
      sessionStorage.removeItem(PASSKEY_SESSION_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [requirePasskeySession]);

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
