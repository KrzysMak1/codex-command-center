import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Terminal, Lock, Zap } from 'lucide-react';

const LoginPage = () => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const login = useAppStore((s) => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed || trimmed.length < 3) {
      setError('Token musi mieć minimum 3 znaki');
      return;
    }
    login(trimmed);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background grid effect */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 glow-green">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-foreground">
            Codex <span className="text-primary">CLI</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Docker Management Panel</p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">AUTHORIZATION</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(''); }}
                placeholder="Wpisz token dostępu..."
                className="w-full rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
              />
              {error && (
                <p className="mt-1.5 font-mono text-xs text-destructive">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-mono text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] glow-green"
            >
              <Zap className="h-4 w-4" />
              Zaloguj się
            </button>
          </form>

          <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground/50">
            Połączenie szyfrowane • Sesja wygasa po 24h
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
