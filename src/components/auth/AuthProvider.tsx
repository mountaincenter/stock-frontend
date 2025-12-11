'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, signOut, fetchAuthSession, AuthUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
// OAuth リダイレクト後の処理を有効化（Next.js App Router必須）
import 'aws-amplify/auth/enable-oauth-listener';

// Amplify設定
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
          scopes: ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'],
          redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN!],
          redirectSignOut: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT!],
          responseType: 'code' as const,
        },
      },
    },
  },
};

// 一度だけ設定
Amplify.configure(amplifyConfig, { ssr: true });

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkUser() {
    console.log('[AuthProvider] checkUser called');

    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has('code');
    console.log('[AuthProvider] hasCode:', hasCode);

    // codeがある場合は、Amplifyがトークン交換を完了するまで少し待つ
    if (hasCode) {
      console.log('[AuthProvider] OAuth callback detected, waiting for token exchange...');
      // Amplifyがバックグラウンドでトークン交換を行うので少し待つ
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      // タイムアウト付きでセッション取得
      const sessionPromise = fetchAuthSession();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 8000)
      );

      const session = await Promise.race([sessionPromise, timeoutPromise]);
      console.log('[AuthProvider] session:', session.tokens ? 'has tokens' : 'no tokens');

      if (session.tokens) {
        const currentUser = await getCurrentUser();
        console.log('[AuthProvider] currentUser:', currentUser);
        setUser(currentUser);
        // URLからcodeパラメータをクリーンアップ
        if (hasCode) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.log('[AuthProvider] auth error:', err);
      setUser(null);
    } finally {
      console.log('[AuthProvider] setIsLoading(false)');
      setIsLoading(false);
    }
  }

  useEffect(() => {
    checkUser();

    // OAuth認証イベントをリッスン
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      console.log('[AuthProvider] Hub event:', payload.event);
      switch (payload.event) {
        case 'signInWithRedirect':
        case 'signedIn':
          checkUser();
          break;
        case 'signInWithRedirect_failure':
          console.log('[AuthProvider] signInWithRedirect_failure:', payload);
          setUser(null);
          setIsLoading(false);
          break;
        case 'signedOut':
          setUser(null);
          setIsLoading(false);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
