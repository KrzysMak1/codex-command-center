import { useAppStore, type PromptHistoryItem } from '@/store/useAppStore';
import { History, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

const PromptHistory = () => {
  const history = useAppStore((s) => s.history);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Historia promptów
        </span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {history.length === 0 ? (
          <p className="py-4 text-center font-mono text-xs text-muted-foreground">Brak historii</p>
        ) : (
          history.map((item) => <HistoryItem key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
};

const HistoryItem = ({ item }: { item: PromptHistoryItem }) => {
  const statusIcons = {
    pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    running: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
    error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  };

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{statusIcons[item.status]}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs text-foreground">{item.prompt}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{item.timestamp}</span>
            {item.result && (
              <span className={`font-mono text-[10px] ${item.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                • {item.result}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptHistory;
