import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Send, Sparkles } from 'lucide-react';

const PromptInput = () => {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendPrompt, taskStatus, activeProject } = useAppStore();

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || taskStatus.status === 'running') return;

    setIsSubmitting(true);
    await sendPrompt(trimmed);
    setPrompt('');
    setIsSubmitting(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const isRunning = taskStatus.status === 'running' || isSubmitting;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Prompt — {activeProject?.name ?? 'Brak projektu'}
        </span>
      </div>

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isRunning}
          placeholder={isRunning ? 'Zadanie w toku...' : 'Wpisz prompt do Codex backend...'}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={!prompt.trim() || isRunning}
          className="flex h-auto items-end rounded-lg bg-primary px-4 py-3 text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Send className={`h-4 w-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default PromptInput;
