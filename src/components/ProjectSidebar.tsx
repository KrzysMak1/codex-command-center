import { useAppStore, type Project } from '@/store/useAppStore';
import { FolderGit2, ChevronRight, Plus, Menu, X, Terminal } from 'lucide-react';

const ProjectSidebar = () => {
  const { projects, activeProject, setActiveProject, sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2 text-foreground md:hidden"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-mono text-sm font-bold text-sidebar-accent-foreground">Codex CLI</h2>
            <p className="font-mono text-[10px] text-muted-foreground">v2.4.1 • Docker</p>
          </div>
        </div>

        {/* Projects list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Projekty
            </span>
            <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={activeProject?.id === project.id}
                onClick={() => { setActiveProject(project); if (window.innerWidth < 768) toggleSidebar(); }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="font-mono text-[11px] text-sidebar-foreground">Docker: Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
};

const ProjectItem = ({
  project,
  isActive,
  onClick,
}: {
  project: Project;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all ${
      isActive
        ? 'bg-primary/10 text-primary glow-border border border-primary/20'
        : 'border border-transparent text-sidebar-foreground hover:bg-sidebar-accent'
    }`}
  >
    <FolderGit2 className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
    <div className="min-w-0 flex-1">
      <p className="truncate font-mono text-xs font-medium">{project.name}</p>
      <p className="truncate font-mono text-[10px] text-muted-foreground">{project.lastActive}</p>
    </div>
    {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0 text-primary" />}
  </button>
);

export default ProjectSidebar;
