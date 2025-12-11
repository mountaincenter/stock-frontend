'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'aws-amplify/auth';
import { useAuth } from '../../src/components/auth/AuthProvider';
import { Fingerprint, ChevronDown, ChevronUp } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSimpleLogin, setShowSimpleLogin] = useState(false);

  // 認証済みならリダイレクト（useEffectで副作用として実行）
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dev/stock-results');
    }
  }, [isLoading, isAuthenticated, router]);

  // 認証済みの場合はnullを返す（リダイレクト中）
  if (!isLoading && isAuthenticated) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
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
        // パスワード変更が必要な場合
        setError('パスワードの変更が必要です。「パスキー対応ログイン」を使用してください。');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleHostedUILogin() {
    // Amplifyのバリデーションバグを回避するため、手動でHosted UI URLを構築
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN;
    const scopes = ['email', 'openid', 'profile', 'aws.cognito.signin.user.admin'];

    const url = `https://${domain}/oauth2/authorize?` + new URLSearchParams({
      client_id: clientId || '',
      response_type: 'code',
      scope: scopes.join(' '),
      redirect_uri: redirectUri || '',
    }).toString();

    window.location.href = url;
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

        {/* メイン: Hosted UI ログイン（パスキー対応） */}
        <div className="space-y-3">
          <button
            onClick={handleHostedUILogin}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-md hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-center gap-2 font-medium"
          >
            <Fingerprint className="w-5 h-5" />
            パスキー対応ログイン
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Touch ID / 指紋認証 / パスワード に対応
          </p>
        </div>

        {/* シンプルログイン（展開式） */}
        <div className="pt-2">
          <button
            onClick={() => setShowSimpleLogin(!showSimpleLogin)}
            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSimpleLogin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            シンプルログイン（パスワードのみ）
          </button>

          {showSimpleLogin && (
            <div className="mt-4 p-4 border border-border rounded-md bg-muted/30">
              <p className="text-xs text-amber-500 mb-3">
                ※ このログイン方式ではパスキー登録・使用ができません
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
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
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
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
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    placeholder="••••••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? 'ログイン中...' : 'ログイン'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
