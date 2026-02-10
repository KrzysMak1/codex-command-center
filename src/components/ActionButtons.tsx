import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Play, Save, GitPullRequest, AlertTriangle } from 'lucide-react';

const ActionButtons = () => {
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => void } | null>(null);
  const { addLog, taskStatus } = useAppStore();
  const isRunning = taskStatus.status === 'running';

  const actions = [
    {
      label: 'Uruchom testy',
      icon: Play,
      onClick: () => {
        addLog({ timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'info', message: '> Running test suite...' });
        setTimeout(() => addLog({ timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'stdout', message: '✓ All tests passed (23/23)' }), 1500);
      },
    },
    {
      label: 'Zapisz zmiany',
      icon: Save,
      onClick: () => {
        addLog({ timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'info', message: '> Saving changes to workspace...' });
        setTimeout(() => addLog({ timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'stdout', message: '✓ Changes saved successfully' }), 800);
      },
    },
    {
      label: 'Stwórz PR',
      icon: GitPullRequest,
      onClick: () => {
        addLog({ timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'info', message: '> Creating pull request...' });
        setTimeout(() => addLog({ timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'stdout', message: '✓ Pull request #42 created' }), 1200);
      },
    },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            onClick={() => setConfirmAction({ label, action: onClick })}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 font-mono text-xs font-medium text-secondary-foreground transition-all hover:bg-secondary/80 hover:border-primary/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Confirmation modal */}
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
                className="flex-1 rounded-lg border border-border bg-muted px-4 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Anuluj
              </button>
              <button
                onClick={() => { confirmAction.action(); setConfirmAction(null); }}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-mono text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95"
              >
                Potwierdź
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionButtons;
