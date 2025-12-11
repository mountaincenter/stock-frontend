'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, confirmSignIn } from 'aws-amplify/auth';
import { useAuth } from '../../src/components/auth/AuthProvider';
import { Fingerprint, Key } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dev/stock-results');
    }
  }, [isLoading, isAuthenticated, router]);

  if (!isLoading && isAuthenticated) {
    return null;
  }

  // パスワードログイン
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password,
      });

      if (isSignedIn) {
        router.push('/dev/stock-results');
        router.refresh();
      } else if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setError('パスワードの変更が必要です。管理者に連絡してください。');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  // パスキーログイン（登録済みの場合）
  async function handlePasskeyLogin() {
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }
    setError('');
    setIsPasskeyLoading(true);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: 'WEB_AUTHN',
        },
      });

      if (isSignedIn) {
        router.push('/dev/stock-results');
        router.refresh();
      } else if (nextStep?.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
        // パスキーが登録されていない場合
        setError('パスキーが登録されていません。パスワードでログイン後、パスキーを登録してください。');
      }
    } catch (err: unknown) {
      console.error('Passkey login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'パスキーログインに失敗しました';
      if (errorMessage.includes('not found') || errorMessage.includes('No credentials')) {
        setError('パスキーが登録されていません。パスワードでログイン後、パスキーを登録してください。');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border border-border">
        <h1 className="text-2xl font-bold text-center text-foreground">
          ログイン
        </h1>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••••••"
            />
          </div>

          <div className="flex gap-3">
            {/* パスワードログイン */}
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              {isSubmitting ? 'ログイン中...' : 'パスワード'}
            </button>

            {/* パスキーログイン */}
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={isPasskeyLoading || !email}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-md hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              {isPasskeyLoading ? '認証中...' : 'パスキー'}
            </button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          初回はパスワードでログイン → パスキー登録 → 以降パスキーで認証
        </p>
      </div>
    </div>
  );
}
