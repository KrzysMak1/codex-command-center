import { create } from 'zustand';

// Types
export interface Project {
  id: string;
  name: string;
  path: string;
  lastActive: string;
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

// Mock data
export const MOCK_PROJECTS: Project[] = [
  { id: '1', name: 'codex-frontend', path: '/workspace/codex-frontend', lastActive: '2 min ago' },
  { id: '2', name: 'api-service', path: '/workspace/api-service', lastActive: '1h ago' },
  { id: '3', name: 'ml-pipeline', path: '/workspace/ml-pipeline', lastActive: '3h ago' },
];

export const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: '14:32:01', type: 'info', message: '> Codex CLI v2.4.1 initialized' },
  { id: '2', timestamp: '14:32:02', type: 'stdout', message: '> Scanning workspace /workspace/codex-frontend...' },
  { id: '3', timestamp: '14:32:03', type: 'stdout', message: '> Found 47 files, 12 modules' },
  { id: '4', timestamp: '14:32:04', type: 'warning', message: '⚠ Deprecated API usage in src/utils/legacy.ts:23' },
  { id: '5', timestamp: '14:32:05', type: 'stdout', message: '> Analyzing code structure...' },
  { id: '6', timestamp: '14:32:08', type: 'stdout', message: '> Generating improvements for method parseConfig()' },
  { id: '7', timestamp: '14:32:10', type: 'stderr', message: '✗ Error: Cannot resolve import @/legacy/adapter' },
  { id: '8', timestamp: '14:32:11', type: 'stdout', message: '> Applying fix: updated import path' },
  { id: '9', timestamp: '14:32:12', type: 'stdout', message: '> All tests passed (23/23)' },
  { id: '10', timestamp: '14:32:13', type: 'info', message: '✓ Task completed successfully' },
];

export const MOCK_HISTORY: PromptHistoryItem[] = [
  { id: '1', prompt: '/popraw metodę parseConfig()', timestamp: '14:30', status: 'completed', result: 'Fixed 3 issues in parseConfig()' },
  { id: '2', prompt: '/stwórz testy dla modułu auth', timestamp: '14:25', status: 'completed', result: 'Generated 12 test cases' },
  { id: '3', prompt: '/refactor utils/helpers.ts', timestamp: '14:15', status: 'error', result: 'Failed: circular dependency detected' },
];

// Store
interface AppState {
  isAuthenticated: boolean;
  token: string;
  activeProject: Project | null;
  projects: Project[];
  logs: LogEntry[];
  history: PromptHistoryItem[];
  taskStatus: TaskStatus;
  sidebarOpen: boolean;
  login: (token: string) => void;
  logout: () => void;
  setActiveProject: (project: Project) => void;
  addLog: (log: Omit<LogEntry, 'id'>) => void;
  addPrompt: (prompt: string) => void;
  updateTaskStatus: (status: Partial<TaskStatus>) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  token: '',
  activeProject: MOCK_PROJECTS[0],
  projects: MOCK_PROJECTS,
  logs: MOCK_LOGS,
  history: MOCK_HISTORY,
  taskStatus: { status: 'idle', progress: 0 },
  sidebarOpen: true,

  login: (token: string) => set({ isAuthenticated: true, token }),
  logout: () => set({ isAuthenticated: false, token: '' }),
  setActiveProject: (project: Project) => set({ activeProject: project }),
  
  addLog: (log) => set((state) => ({
    logs: [...state.logs, { ...log, id: String(Date.now()) }],
  })),

  addPrompt: (prompt: string) => {
    const newItem: PromptHistoryItem = {
      id: String(Date.now()),
      prompt,
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      status: 'running',
    };
    set((state) => ({
      history: [newItem, ...state.history],
      taskStatus: { status: 'running', progress: 0, currentStep: 'Processing prompt...', startedAt: new Date().toISOString() },
    }));

    // Simulate task progress
    const steps = [
      { progress: 20, step: 'Analyzing code...', delay: 800 },
      { progress: 50, step: 'Generating changes...', delay: 1500 },
      { progress: 80, step: 'Running tests...', delay: 2200 },
      { progress: 100, step: 'Completed', delay: 3000 },
    ];

    steps.forEach(({ progress, step, delay }) => {
      setTimeout(() => {
        set((state) => {
          const status: TaskStatus = progress === 100
            ? { status: 'completed', progress: 100, currentStep: step }
            : { status: 'running', progress, currentStep: step };
          
          // Add log entries
          const logType = progress === 100 ? 'info' as const : 'stdout' as const;
          const newLog: LogEntry = {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type: logType,
            message: progress === 100 ? `✓ ${step}` : `> ${step}`,
          };

          const updatedHistory = state.history.map((h) =>
            h.id === newItem.id
              ? { ...h, status: (progress === 100 ? 'completed' : 'running') as PromptHistoryItem['status'], result: progress === 100 ? 'Task completed successfully' : undefined }
              : h
          );

          return { taskStatus: status, logs: [...state.logs, newLog], history: updatedHistory };
        });
      }, delay);
    });
  },

  updateTaskStatus: (status) => set((state) => ({
    taskStatus: { ...state.taskStatus, ...status },
  })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
