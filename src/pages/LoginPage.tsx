import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { Terminal, Lock, Zap, Link, WalletCards, ExternalLink, CheckCircle2 } from 'lucide-react';

type LoginMode = 'api_key' | 'codex_cli';

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState<LoginMode>('codex_cli');
  const [openAiKey, setOpenAiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const loginWithApiKey = useAppStore((s) => s.loginWithApiKey);
  const loginWithCodexCli = useAppStore((s) => s.loginWithCodexCli);
  const defaultBaseUrl = useAppStore((s) => s.apiBaseUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (loginMode === 'api_key') {
        const trimmed = openAiKey.trim();
        if (!trimmed || !trimmed.startsWith('sk-')) {
          setError('Podaj poprawny klucz API (sk-...)');
          setIsLoading(false);
          return;
        }
        await loginWithApiKey(trimmed, baseUrl || defaultBaseUrl);
      } else {
        const resolvedBaseUrl = baseUrl || defaultBaseUrl;
        const start = await api.startCliLogin({ baseUrl: resolvedBaseUrl, token: '', authMode: 'codex_cli' });
        if (start.loginUrl) {
          window.open(start.loginUrl, '_blank', 'noopener,noreferrer');
        }

        let loggedIn = false;
        for (let attempt = 0; attempt < 45; attempt += 1) {
          try {
            await api.checkCliAuth({ baseUrl: resolvedBaseUrl, token: '', authMode: 'codex_cli' });
            await loginWithCodexCli(resolvedBaseUrl);
            loggedIn = useAppStore.getState().isAuthenticated;
            if (loggedIn) break;
          } catch {
            // Waiting for user to complete CLI login.
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (!loggedIn) {
          setError('Nie wykryto logowania CLI. Dokończ logowanie w nowej karcie i spróbuj ponownie.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logowanie nie powiodło się');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 glow-green">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-foreground">
            Codex <span className="text-primary">Control</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Zaloguj się przez Codex CLI albo API key</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">AUTHORIZATION</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted p-1">
            <button
              onClick={() => setLoginMode('codex_cli')}
              className={`rounded px-3 py-2 font-mono text-xs ${
                loginMode === 'codex_cli' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Codex CLI
            </button>
            <button
              onClick={() => setLoginMode('api_key')}
              className={`rounded px-3 py-2 font-mono text-xs ${
                loginMode === 'api_key' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              API key
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                API Base URL (panel backend)
              </label>
              <div className="relative">
                <Link className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={defaultBaseUrl}
                  className="w-full rounded-lg border border-border bg-muted py-3 pl-9 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {loginMode === 'api_key' ? (
              <>
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <a
                    href="https://platform.openai.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Konto Codex/OpenAI <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Wygeneruj API key <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Codex/OpenAI API Key
                  </label>
                  <div className="relative">
                    <WalletCards className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={openAiKey}
                      onChange={(e) => {
                        setOpenAiKey(e.target.value);
                        setError('');
                      }}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-border bg-muted py-3 pl-9 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                <p className="font-mono text-xs text-foreground">Tryb konta Codex (ChatGPT Plus/Pro/Team):</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  1) Kliknij logowanie CLI — panel automatycznie odpali proces logowania Codex i otworzy stronę autoryzacji.
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  2) Po zalogowaniu panel sam wykryje sesję i automatycznie przejdzie do dashboardu.
                </p>
                <p className="flex items-center gap-1 font-mono text-[11px] text-terminal-green">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Bez podawania klucza API.
                </p>
              </div>
            )}

            {error && <p className="mt-1.5 font-mono text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="glow-green flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-mono text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Zap className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading
                ? 'Weryfikacja...'
                : loginMode === 'codex_cli'
                  ? 'Zaloguj przez Codex CLI'
                  : 'Zaloguj przez API key'}
            </button>
          </form>

          <p className="mt-4 text-center font-mono text-[10px] text-muted-foreground/60">
            Dla trybu API key wymagany jest aktywny billing API. Dla CLI używasz konta Codex (np. Plus/Pro).
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
