import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Send, Sparkles, Terminal } from 'lucide-react';

const PromptInput = () => {
  const [prompt, setPrompt] = useState('');
  const [command, setCommand] = useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [isSubmittingCommand, setIsSubmittingCommand] = useState(false);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const { sendPrompt, runAction, taskStatus, activeProject } = useAppStore();

  const isBusy = taskStatus.status === 'running';

  const resetPromptHeight = () => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
    }
  };

  const handlePromptSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;

    setIsSubmittingPrompt(true);
    await sendPrompt(trimmed);
    setPrompt('');
    setIsSubmittingPrompt(false);
    resetPromptHeight();
  };

  const handleCommandSubmit = async () => {
    const trimmed = command.trim();
    if (!trimmed || isBusy) return;

    setIsSubmittingCommand(true);
    await runAction(trimmed, 'Komenda shell');
    setCommand('');
    setIsSubmittingCommand(false);

    commandInputRef.current?.focus();
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handlePromptSubmit();
    }
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleCommandSubmit();
    }
  };

  const handlePromptInput = () => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
      promptTextareaRef.current.style.height = `${Math.min(promptTextareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const isPromptDisabled = isBusy || isSubmittingPrompt;
  const isCommandDisabled = isBusy || isSubmittingCommand;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Prompt — {activeProject?.name ?? 'Brak projektu'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <textarea
            ref={promptTextareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handlePromptKeyDown}
            onInput={handlePromptInput}
            disabled={isPromptDisabled}
            placeholder={isPromptDisabled ? 'Zadanie w toku...' : 'Wpisz prompt do Codex...'}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => void handlePromptSubmit()}
            disabled={!prompt.trim() || isPromptDisabled}
            className="flex h-auto items-end rounded-lg bg-primary px-4 py-3 text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            title="Wyślij prompt do Codex"
          >
            <Send className={`h-4 w-4 ${isSubmittingPrompt ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <input
            ref={commandInputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleCommandKeyDown}
            disabled={isCommandDisabled}
            placeholder={isCommandDisabled ? 'Wykonywanie...' : 'Wpisz komendę shell do uruchomienia w kontenerze'}
            className="h-10 flex-1 rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            onClick={() => void handleCommandSubmit()}
            disabled={!command.trim() || isCommandDisabled}
            className="rounded-md border border-border px-3 py-2 font-mono text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Uruchom
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
