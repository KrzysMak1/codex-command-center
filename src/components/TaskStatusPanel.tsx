import { useAppStore } from '@/store/useAppStore';
import { Activity, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const TaskStatusPanel = () => {
  const taskStatus = useAppStore((s) => s.taskStatus);

  const statusConfig = {
    idle: { icon: Clock, label: 'Oczekuje', color: 'text-muted-foreground' },
    running: { icon: Loader2, label: 'W toku', color: 'text-primary' },
    merging: { icon: Loader2, label: 'Mergowanie', color: 'text-terminal-yellow' },
    testing: { icon: Loader2, label: 'Testowanie', color: 'text-terminal-blue' },
    completed: { icon: CheckCircle2, label: 'Ukończono', color: 'text-primary' },
    error: { icon: XCircle, label: 'Błąd', color: 'text-destructive' },
  };

  const config = statusConfig[taskStatus.status];
  const Icon = config.icon;
  const isAnimating = ['running', 'merging', 'testing'].includes(taskStatus.status);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Status</span>
      </div>

      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.color} ${isAnimating ? 'animate-spin' : ''}`} />
        <div className="flex-1">
          <p className={`font-mono text-sm font-medium ${config.color}`}>{config.label}</p>
          {taskStatus.currentStep && (
            <p className="font-mono text-[11px] text-muted-foreground">{taskStatus.currentStep}</p>
          )}
        </div>
        <span className="font-mono text-lg font-bold text-foreground">{taskStatus.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${taskStatus.progress}%` }}
        />
      </div>
    </div>
  );
};

export default TaskStatusPanel;
