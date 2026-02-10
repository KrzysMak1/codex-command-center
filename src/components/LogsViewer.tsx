import { useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Monitor } from 'lucide-react';

const LogsViewer = () => {
  const logs = useAppStore((s) => s.logs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'stdout': return 'text-terminal-green';
      case 'stderr': return 'text-terminal-red';
      case 'warning': return 'text-terminal-yellow';
      case 'info': return 'text-terminal-blue';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Monitor className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Terminal Logs
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{logs.length} lines</span>
      </div>

      <div className="flex-1 overflow-y-auto bg-background/50 p-4 font-mono text-xs leading-relaxed">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 py-0.5 animate-fade-in">
            <span className="flex-shrink-0 text-terminal-dim select-none">{log.timestamp}</span>
            <span className={getLogColor(log.type)}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogsViewer;
