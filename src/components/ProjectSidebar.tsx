import { useState } from 'react';
import { useAppStore, type Project } from '@/store/useAppStore';
import { ChevronRight, Plus, Menu, X, Terminal, PlugZap, Container, FolderSearch } from 'lucide-react';

const ProjectSidebar = () => {
  const {
    projects,
    activeProject,
    setActiveProject,
    createWorkspace,
    sidebarOpen,
    toggleSidebar,
    connectionStatus,
  } = useAppStore();

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('/workspace');
  const [imageName, setImageName] = useState('ghcr.io/openai/codex-universal:latest');
  const [codeMountPath, setCodeMountPath] = useState('/workspace/project');
  const [homePath, setHomePath] = useState('/codex-home');
  const [systemHostPath, setSystemHostPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [pathError, setPathError] = useState('');

  const addNewProject = async () => {
    const path = projectPath.trim();
    if (!path) {
      setPathError('Podaj katalog na dysku hosta.');
      return;
    }

    setIsCreating(true);
    setPathError('');
    await createWorkspace({
      name: projectName.trim() || undefined,
      path,
      image: imageName.trim() || undefined,
      codeMountPath: codeMountPath.trim() || undefined,
      homePath: homePath.trim() || undefined,
      systemHostPath: systemHostPath.trim() || undefined,
    });
    setIsCreating(false);
    setProjectName('');
    setProjectPath('/workspace');
    setCodeMountPath('/workspace/project');
    setHomePath('/codex-home');
    setSystemHostPath('');
    setShowProjectForm(false);
  };

  const pickDirectory = async () => {
    try {
      const picker = (window as Window & { showDirectoryPicker?: () => Promise<{ name?: string }> }).showDirectoryPicker;
      if (!picker) {
        setPathError('Twoja przeglądarka nie wspiera wyboru folderu – wpisz ścieżkę ręcznie.');
        return;
      }

      const selected = await picker();
      if (selected?.name && !projectName) {
        setProjectName(selected.name);
      }
      setPathError('Wybrano folder. Jeśli potrzeba, wpisz pełną ścieżkę hosta (np. /mnt/dysk2/projekt).');
    } catch {
      setPathError('Nie wybrano katalogu.');
    }
  };

  const connectionLabel = {
    connected: 'API: Connected',
    connecting: 'API: Connecting...',
    disconnected: 'API: Disconnected',
  }[connectionStatus];

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2 text-foreground md:hidden"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-mono text-sm font-bold text-sidebar-accent-foreground">Codex Control</h2>
            <p className="font-mono text-[10px] text-muted-foreground">katalog ➜ kontener</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Projekty</span>
            <button
              onClick={() => setShowProjectForm((current) => !current)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {showProjectForm && (
            <div className="mb-3 space-y-2 rounded-lg border border-border bg-sidebar-accent p-2">
              <p className="px-0.5 font-mono text-[10px] text-muted-foreground">
                Ręczne mapowanie: osobno kod, osobno system/home kontenera.
              </p>

              <div>
                <label className="mb-1 block px-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Nazwa projektu
                </label>
                <input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Np. sklep-frontend (opcjonalnie)"
                  className="w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block px-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Host: katalog kodu
                </label>
                <input
                  value={projectPath}
                  onChange={(event) => {
                    setProjectPath(event.target.value);
                    setPathError('');
                  }}
                  placeholder="Np. /workspace/repo albo /mnt/dysk2/repo"
                  className="w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                />
                {pathError && <p className="mt-1 px-0.5 font-mono text-[10px] text-muted-foreground">{pathError}</p>}
              </div>

              <button
                type="button"
                onClick={() => void pickDirectory()}
                className="flex w-full items-center justify-center gap-1 rounded border border-border bg-muted px-2 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                <FolderSearch className="h-3.5 w-3.5" />
                Wybierz folder (podpowiedź nazwy)
              </button>

              <div>
                <label className="mb-1 block px-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Kontener: ścieżka kodu
                </label>
                <input
                  value={codeMountPath}
                  onChange={(event) => setCodeMountPath(event.target.value)}
                  placeholder="Np. /workspace/project"
                  className="w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block px-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Kontener: ścieżka system/home
                </label>
                <input
                  value={homePath}
                  onChange={(event) => setHomePath(event.target.value)}
                  placeholder="Np. /codex-home"
                  className="w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block px-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Host: katalog systemowy (opcjonalnie)
                </label>
                <input
                  value={systemHostPath}
                  onChange={(event) => setSystemHostPath(event.target.value)}
                  placeholder="Puste = osobny volume Docker, lub np. /mnt/dysk2/codex-state"
                  className="w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block px-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Obraz Dockera
                </label>
                <input
                  value={imageName}
                  onChange={(event) => setImageName(event.target.value)}
                  placeholder="Np. ghcr.io/openai/codex-universal:latest"
                  className="w-full rounded border border-border bg-muted px-2 py-1.5 font-mono text-xs"
                />
              </div>

              <button
                onClick={() => void addNewProject()}
                disabled={isCreating}
                className="w-full rounded bg-primary px-2 py-1.5 font-mono text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isCreating ? 'Tworzenie kontenera...' : 'Utwórz kontener'}
              </button>
            </div>
          )}

          <div className="space-y-1">
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={activeProject?.id === project.id}
                onClick={() => {
                  setActiveProject(project);
                  if (window.innerWidth < 768) toggleSidebar();
                }}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <PlugZap className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] text-sidebar-foreground">{connectionLabel}</span>
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
        ? 'glow-border border border-primary/20 bg-primary/10 text-primary'
        : 'border border-transparent text-sidebar-foreground hover:bg-sidebar-accent'
    }`}
  >
    <Container className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
    <div className="min-w-0 flex-1">
      <p className="truncate font-mono text-xs font-medium">{project.name}</p>
      <p className="truncate font-mono text-[10px] text-muted-foreground">{project.path}</p>
    </div>
    {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0 text-primary" />}
  </button>
);

export default ProjectSidebar;
