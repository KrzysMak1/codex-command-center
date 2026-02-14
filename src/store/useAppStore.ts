import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, type ApiLog, type ApiTaskStatus, type AuthMode } from '@/lib/api';

export interface Project {
  id: string;
  name: string;
  path: string;
  lastActive: string;
  containerName?: string;
  codeMountPath?: string;
  homePath?: string;
  systemVolumeName?: string;
  systemHostPath?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'stdout' | 'stderr' | 'warning' | 'info';
  message: string;
}

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
}

export interface TaskStatus {
  status: 'idle' | 'running' | 'merging' | 'testing' | 'completed' | 'error';
  progress: number;
  currentStep?: string;
  startedAt?: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const now = () => new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const toTaskStatus = (status: ApiTaskStatus): TaskStatus => ({
  status: status.status,
  progress: status.progress,
  currentStep: status.currentStep,
  startedAt: status.startedAt,
});

const toLog = (log: ApiLog): LogEntry => ({
  id: log.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  timestamp: log.timestamp ?? now(),
  type: log.type ?? 'info',
  message: log.message,
});

interface AppState {
  isAuthenticated: boolean;
  token: string;
  authMode: AuthMode;
  apiBaseUrl: string;
  connectionStatus: ConnectionStatus;
  lastError: string | null;
  activeProject: Project | null;
  projects: Project[];
  logs: LogEntry[];
  history: PromptHistoryItem[];
  taskStatus: TaskStatus;
  sidebarOpen: boolean;
  loginWithApiKey: (token: string, baseUrl?: string) => Promise<void>;
  loginWithCodexCli: (baseUrl?: string) => Promise<void>;
  logout: () => void;
  setActiveProject: (project: Project) => void;
  createWorkspace: (payload: {
    name?: string;
    path: string;
    image?: string;
    codeMountPath?: string;
    homePath?: string;
    systemHostPath?: string;
  }) => Promise<void>;
  addLog: (log: Omit<LogEntry, 'id'>) => void;
  sendPrompt: (prompt: string) => Promise<void>;
  runAction: (command: string, label: string) => Promise<void>;
  uploadProjectZip: (file: File) => Promise<void>;
  downloadLatestJar: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  toggleSidebar: () => void;
}

const getApiConfig = (state: Pick<AppState, 'apiBaseUrl' | 'token' | 'authMode'>) => ({
  baseUrl: state.apiBaseUrl,
  token: state.token,
  authMode: state.authMode,
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: '',
      authMode: 'api_key',
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
      connectionStatus: 'disconnected',
      lastError: null,
      activeProject: null,
      projects: [],
      logs: [{ id: 'boot-1', timestamp: now(), type: 'info', message: '> Wybierz tryb logowania: API key lub Codex CLI.' }],
      history: [],
      taskStatus: { status: 'idle', progress: 0 },
      sidebarOpen: true,

      loginWithApiKey: async (token, baseUrl) => {
        const nextBaseUrl = baseUrl?.trim() || get().apiBaseUrl;

        set({
          isAuthenticated: false,
          token,
          authMode: 'api_key',
          apiBaseUrl: nextBaseUrl,
          connectionStatus: 'connecting',
          lastError: null,
        });

        try {
          await api.authenticateOpenAi({ baseUrl: nextBaseUrl, token, authMode: 'api_key' });
          set({ isAuthenticated: true });
          await Promise.all([get().refreshProjects(), get().refreshStatus(), get().refreshLogs()]);
          set({ connectionStatus: 'connected' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nie udało się połączyć z API/OpenAI';
          set({ connectionStatus: 'disconnected', lastError: message, isAuthenticated: false });
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ ${message}` });
        }
      },

      loginWithCodexCli: async (baseUrl) => {
        const nextBaseUrl = baseUrl?.trim() || get().apiBaseUrl;

        set({
          isAuthenticated: false,
          token: '',
          authMode: 'codex_cli',
          apiBaseUrl: nextBaseUrl,
          connectionStatus: 'connecting',
          lastError: null,
        });

        try {
          await api.checkCliAuth({ baseUrl: nextBaseUrl, token: '', authMode: 'codex_cli' });
          set({ isAuthenticated: true });
          await Promise.all([get().refreshProjects(), get().refreshStatus(), get().refreshLogs()]);
          set({ connectionStatus: 'connected' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Codex CLI nie jest zalogowany';
          set({ connectionStatus: 'disconnected', lastError: message, isAuthenticated: false });
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ ${message}` });
        }
      },

      logout: () => set({ isAuthenticated: false, token: '', connectionStatus: 'disconnected' }),
      setActiveProject: (project) => {
        set({ activeProject: project });
        void get().refreshStatus();
        void get().refreshLogs();
      },

      createWorkspace: async ({ name, path, image, codeMountPath, homePath, systemHostPath }) => {
        const state = get();

        try {
          const project = await api.createWorkspace(getApiConfig(state), {
            name,
            path,
            image,
            codeMountPath,
            homePath,
            systemHostPath,
          });
          const mapped: Project = {
            id: project.id,
            name: project.name,
            path: project.path,
            lastActive: project.lastActive ?? 'przed chwilą',
            containerName: project.containerName,
            codeMountPath: project.codeMountPath,
            homePath: project.homePath,
            systemVolumeName: project.systemVolumeName,
            systemHostPath: project.systemHostPath,
          };
          set((current) => ({
            projects: [mapped, ...current.projects.filter((entry) => entry.id !== mapped.id)],
            activeProject: mapped,
            connectionStatus: 'connected',
            lastError: null,
          }));
          get().addLog({ timestamp: now(), type: 'info', message: `✓ Utworzono kontener: ${mapped.name}` });
          await Promise.all([get().refreshStatus(), get().refreshLogs()]);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nie udało się utworzyć kontenera';
          set({ lastError: message });
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ ${message}` });
        }
      },

      addLog: (log) => set((state) => ({ logs: [...state.logs, { ...log, id: String(Date.now()) }] })),

      sendPrompt: async (prompt) => {
        const state = get();
        const historyId = String(Date.now());

        set((current) => ({
          history: [{ id: historyId, prompt, timestamp: now(), status: 'running' }, ...current.history],
          taskStatus: { status: 'running', progress: Math.max(current.taskStatus.progress, 5), currentStep: 'Wysyłanie promptu...' },
        }));

        try {
          await api.sendPrompt(getApiConfig(state), {
            prompt,
            projectPath: state.activeProject?.path,
            projectId: state.activeProject?.id,
          });
          await Promise.all([get().refreshStatus(), get().refreshLogs()]);

          set((current) => ({
            history: current.history.map((item) =>
              item.id === historyId ? { ...item, status: 'completed', result: 'Prompt wykonany w kontenerze' } : item,
            ),
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nie udało się wysłać promptu';
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ ${message}` });

          set((current) => ({
            taskStatus: { ...current.taskStatus, status: 'error', currentStep: message },
            history: current.history.map((item) =>
              item.id === historyId ? { ...item, status: 'error', result: message } : item,
            ),
          }));
        }
      },


      uploadProjectZip: async (file) => {
        const state = get();
        const activeProject = state.activeProject;

        if (!activeProject) {
          get().addLog({ timestamp: now(), type: 'warning', message: '⚠ Najpierw wybierz projekt.' });
          return;
        }

        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = '';
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          const zipBase64 = btoa(binary);

          const result = await api.uploadProjectZip(getApiConfig(state), {
            projectId: activeProject.id,
            projectPath: activeProject.path,
            fileName: file.name,
            zipBase64,
          });

          get().addLog({
            timestamp: now(),
            type: 'info',
            message: `✓ Wgrano ${file.name} do ${result.targetPath}`,
          });

          await get().refreshLogs();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nie udało się wgrać ZIP-a';
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ Upload ZIP: ${message}` });
          set({ lastError: message });
        }
      },


      downloadLatestJar: async () => {
        const state = get();
        const activeProject = state.activeProject;

        if (!activeProject) {
          get().addLog({ timestamp: now(), type: 'warning', message: '⚠ Najpierw wybierz projekt.' });
          return;
        }

        try {
          const result = await api.downloadLatestJar(getApiConfig(state), activeProject.id);
          const url = URL.createObjectURL(result.blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = result.fileName;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
          get().addLog({ timestamp: now(), type: 'info', message: `✓ Pobrano JAR: ${result.fileName}` });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Nie udało się pobrać JAR';
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ Pobieranie JAR: ${message}` });
        }
      },

      runAction: async (command, label) => {
        const state = get();

        try {
          await api.runCommand(getApiConfig(state), {
            command,
            projectPath: state.activeProject?.path,
            projectId: state.activeProject?.id,
          });
          get().addLog({ timestamp: now(), type: 'info', message: `> ${label} (${command})` });
          await Promise.all([get().refreshStatus(), get().refreshLogs()]);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Akcja nie powiodła się';
          get().addLog({ timestamp: now(), type: 'stderr', message: `✗ ${label}: ${message}` });
        }
      },

      refreshStatus: async () => {
        const state = get();
        const status = await api.getStatus(getApiConfig(state), state.activeProject?.id);
        set({ taskStatus: toTaskStatus(status), connectionStatus: 'connected', lastError: null });
      },

      refreshLogs: async () => {
        const state = get();
        const logs = await api.getLogs(getApiConfig(state), state.activeProject?.id);
        set({ logs: logs.map(toLog), connectionStatus: 'connected', lastError: null });
      },

      refreshProjects: async () => {
        const state = get();
        const projects = await api.getProjects(getApiConfig(state));
        const mapped: Project[] = projects.map((project) => ({
          id: project.id,
          name: project.name,
          path: project.path,
          lastActive: project.lastActive ?? 'z backendu',
          containerName: project.containerName,
          codeMountPath: project.codeMountPath,
          homePath: project.homePath,
          systemVolumeName: project.systemVolumeName,
          systemHostPath: project.systemHostPath,
        }));

        set((current) => ({
          projects: mapped,
          activeProject: mapped.find((project) => project.id === current.activeProject?.id) ?? mapped[0] ?? null,
        }));
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'codex-command-center-state',
      partialize: (state) => ({
        token: state.token,
        authMode: state.authMode,
        isAuthenticated: state.isAuthenticated,
        apiBaseUrl: state.apiBaseUrl,
      }),
    },
  ),
);
