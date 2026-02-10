import { useAppStore } from '@/store/useAppStore';
import { LogOut, FolderOpen } from 'lucide-react';
import ProjectSidebar from '@/components/ProjectSidebar';
import PromptInput from '@/components/PromptInput';
import LogsViewer from '@/components/LogsViewer';
import TaskStatusPanel from '@/components/TaskStatusPanel';
import PromptHistory from '@/components/PromptHistory';
import ActionButtons from '@/components/ActionButtons';

const Dashboard = () => {
  const { logout, activeProject } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ProjectSidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 ml-10 md:ml-0">
            <FolderOpen className="h-4 w-4 text-primary" />
            <div>
              <h1 className="font-mono text-sm font-bold text-foreground">
                {activeProject?.name ?? 'Brak projektu'}
              </h1>
              <p className="font-mono text-[10px] text-muted-foreground">
                {activeProject?.path ?? '—'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Wyloguj</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="flex flex-col gap-4 min-h-0">
              <PromptInput />
              <TaskStatusPanel />
              <ActionButtons />
              <LogsViewer />
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              <PromptHistory />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
