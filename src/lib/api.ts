export type AuthMode = 'api_key' | 'codex_cli';

export interface ApiClientConfig {
  baseUrl: string;
  token: string;
  authMode?: AuthMode;
}

export interface ApiProject {
  id: string;
  name: string;
  path: string;
  lastActive?: string;
  containerName?: string;
  codeMountPath?: string;
  homePath?: string;
  systemVolumeName?: string;
  systemHostPath?: string;
}

export interface ApiLog {
  id?: string;
  timestamp?: string;
  type?: 'stdout' | 'stderr' | 'warning' | 'info';
  message: string;
}

export interface ApiTaskStatus {
  status: 'idle' | 'running' | 'merging' | 'testing' | 'completed' | 'error';
  progress: number;
  currentStep?: string;
  startedAt?: string;
}



export interface ZipUploadResponse {
  ok: boolean;
  extractedFiles?: number;
  targetPath: string;
}

export interface CliLoginStartResponse {
  started: boolean;
  running: boolean;
  loginUrl: string;
  message: string;
}


export interface DownloadedJar {
  fileName: string;
  blob: Blob;
}

export interface CliAuthStatus {
  codexInstalled: boolean;
  codexVersion?: string;
  cliSessionDetected: boolean;
  sessionPath?: string;
  loginHint: string;
}

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const createHeaders = (config: ApiClientConfig, hasBody: boolean) => ({
  ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
  ...(config.authMode === 'codex_cli' ? { 'X-Codex-CLI-Auth': 'true' } : {}),
});

const withQuery = (path: string, query?: Record<string, string | undefined>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
};

async function request<T>(config: ApiClientConfig, path: string, init?: RequestInit): Promise<T> {
  const hasBody = Boolean(init?.body);
  const response = await fetch(`${normalizeUrl(config.baseUrl)}${path}`, {
    ...init,
    headers: {
      ...createHeaders(config, hasBody),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}


const downloadJar = async (config: ApiClientConfig, projectId?: string): Promise<DownloadedJar> => {
  const response = await fetch(`${normalizeUrl(config.baseUrl)}${withQuery('/artifacts/jar/download', { projectId })}`, {
    method: 'GET',
    headers: createHeaders(config, false),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  const fileName = match?.[1] ?? 'artifact.jar';

  return { fileName, blob: await response.blob() };
};

export const api = {
  authenticateOpenAi: (config: ApiClientConfig) => request<{ ok: boolean }>(config, '/auth/openai'),
  checkCliAuth: (config: ApiClientConfig) => request<CliAuthStatus>(config, '/auth/cli'),
  startCliLogin: (config: ApiClientConfig) => request<CliLoginStartResponse>(config, '/auth/cli/start', { method: 'POST' }),
  getStatus: (config: ApiClientConfig, projectId?: string) =>
    request<ApiTaskStatus>(config, withQuery('/status', { projectId })),
  getLogs: (config: ApiClientConfig, projectId?: string) =>
    request<ApiLog[]>(config, withQuery('/logs', { projectId })),
  getProjects: (config: ApiClientConfig) => request<ApiProject[]>(config, '/projects'),
  createWorkspace: (config: ApiClientConfig, payload: {
    path: string;
    name?: string;
    image?: string;
    codeMountPath?: string;
    homePath?: string;
    systemHostPath?: string;
  }) =>
    request<ApiProject>(config, '/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendPrompt: (config: ApiClientConfig, payload: { prompt: string; projectId?: string; projectPath?: string }) =>
    request<{ taskId?: string }>(config, '/prompt', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runCommand: (config: ApiClientConfig, payload: { command: string; projectId?: string; projectPath?: string }) =>
    request<{ accepted: boolean; message?: string }>(config, '/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  downloadLatestJar: (config: ApiClientConfig, projectId?: string) => downloadJar(config, projectId),
  uploadProjectZip: (
    config: ApiClientConfig,
    payload: { projectId?: string; projectPath?: string; fileName: string; zipBase64: string },
  ) =>
    request<ZipUploadResponse>(config, '/upload-zip', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
