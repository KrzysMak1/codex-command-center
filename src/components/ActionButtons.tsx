import { useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Play, Save, GitPullRequest, AlertTriangle, Upload, Package, Download } from 'lucide-react';

const ActionButtons = () => {
  const [confirmAction, setConfirmAction] = useState<{ label: string; command: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { runAction, uploadProjectZip, downloadLatestJar, taskStatus } = useAppStore();
  const isRunning = taskStatus.status === 'running';

  const actions = [
    { label: 'Uruchom testy', icon: Play, command: 'test' },
    { label: 'Zapisz zmiany', icon: Save, command: 'save' },
    { label: 'Stwórz PR', icon: GitPullRequest, command: 'create-pr' },
    { label: 'Zbuduj JAR (Java)', icon: Package, command: 'build-jar' },
  ];

  const executeAction = async () => {
    if (!confirmAction) return;

    const action = confirmAction;
    setConfirmAction(null);
    setLoadingAction(action.label);

    try {
      await runAction(action.command, action.label);
    } finally {
      setLoadingAction(null);
    }
  };

  const onPickZip = () => fileInputRef.current?.click();

  const onZipSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      event.target.value = '';
      return;
    }

    setLoadingAction('Wgrywanie ZIP');
    await uploadProjectZip(file);
    setLoadingAction(null);
    event.target.value = '';
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, icon: Icon, command }) => (
          <button
            key={label}
            onClick={() => setConfirmAction({ label, command })}
            disabled={isRunning || Boolean(loadingAction)}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 font-mono text-xs font-medium text-secondary-foreground transition-all hover:border-primary/30 hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}


        <button
          onClick={() => void downloadLatestJar()}
          disabled={isRunning || Boolean(loadingAction)}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 font-mono text-xs font-medium text-secondary-foreground transition-all hover:border-primary/30 hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Pobierz ostatni JAR
        </button>

        <button
          onClick={onPickZip}
          disabled={isRunning || Boolean(loadingAction)}
          className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 font-mono text-xs font-medium text-secondary-foreground transition-all hover:border-primary/30 hover:bg-secondary/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Upload className="h-3.5 w-3.5" />
          {loadingAction === 'Wgrywanie ZIP' ? 'Wgrywanie ZIP...' : 'Wyślij kod ZIP'}
        </button>

        <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={onZipSelected} />
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl animate-fade-in">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-semibold text-foreground">Potwierdź akcję</h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Czy na pewno chcesz: <strong>{confirmAction.label}</strong>?
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={Boolean(loadingAction)}
                className="flex-1 rounded-lg border border-border bg-muted px-4 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => void executeAction()}
                disabled={Boolean(loadingAction)}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:opacity-70"
              >
                {loadingAction ? 'Wysyłanie...' : 'Potwierdź'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionButtons;
