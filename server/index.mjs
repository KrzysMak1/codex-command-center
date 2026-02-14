import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const app = express();
const PORT = Number(process.env.PORT ?? 8787);
const DEFAULT_IMAGE = process.env.CODEX_CONTAINER_IMAGE ?? 'ghcr.io/openai/codex-universal:latest';
const CONTAINER_CODE_PATH = process.env.CODEX_CONTAINER_CODE_PATH ?? '/workspace/project';
const CONTAINER_HOME_PATH = process.env.CODEX_CONTAINER_HOME_PATH ?? '/codex-home';

app.use(cors());
app.use(express.json({ limit: '250mb' }));

const projects = new Map();
const logsByProject = new Map();
const statusByProject = new Map();

const cliLoginState = {
  running: false,
  startedAt: undefined,
  loginUrl: 'https://chatgpt.com/codex',
  lastOutput: '',
};

const now = () => new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const log = (projectId, type, message) => {
  const current = logsByProject.get(projectId) ?? [];
  current.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, timestamp: now(), type, message });
  logsByProject.set(projectId, current.slice(-500));
};

const streamLines = ({ chunk, buffer, onLine }) => {
  const merged = `${buffer}${chunk.toString()}`;
  const normalized = merged.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const rest = lines.pop() ?? '';
  lines
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .forEach(onLine);
  return rest;
};

const runCmd = (cmd, args) =>
  new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `${cmd} exited with code ${code}`));
      }
    });
  });

const runCmdStreaming = ({ cmd, args, onStdoutLine, onStderrLine, onHeartbeat }) =>
  new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let stdoutBuffer = '';
    let stderrBuffer = '';
    const startedAt = Date.now();

    const heartbeat = setInterval(() => {
      if (onHeartbeat) {
        onHeartbeat(Math.floor((Date.now() - startedAt) / 1000));
      }
    }, 10000);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      stdoutBuffer = streamLines({
        chunk,
        buffer: stdoutBuffer,
        onLine: (line) => {
          if (onStdoutLine) onStdoutLine(line);
        },
      });
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      stderrBuffer = streamLines({
        chunk,
        buffer: stderrBuffer,
        onLine: (line) => {
          if (onStderrLine) onStderrLine(line);
        },
      });
    });

    proc.on('error', (error) => {
      clearInterval(heartbeat);
      reject(error);
    });

    proc.on('close', (code) => {
      clearInterval(heartbeat);

      if (stdoutBuffer.trim() && onStdoutLine) {
        onStdoutLine(stdoutBuffer.trimEnd());
      }
      if (stderrBuffer.trim() && onStderrLine) {
        onStderrLine(stderrBuffer.trimEnd());
      }

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `${cmd} exited with code ${code}`));
      }
    });
  });

const sanitizeName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';

const PROJECT_LABEL_PREFIX = 'codex.command-center';

const toProjectIdFromContainer = (containerId) => `docker-${containerId.slice(0, 12)}`;

const inferProjectFromContainer = (container) => {
  const labels = container?.Config?.Labels ?? {};
  const mounts = Array.isArray(container?.Mounts) ? container.Mounts : [];
  const containerName = String(container?.Name ?? '').replace(/^\//, '');

  const labeledCodeMountPath = labels[`${PROJECT_LABEL_PREFIX}.code_mount_path`];
  const codeMountPath = labeledCodeMountPath || mounts.find((mount) => mount?.Type === 'bind')?.Destination || CONTAINER_CODE_PATH;

  const codeMount = mounts.find((mount) => mount?.Destination === codeMountPath)
    ?? mounts.find((mount) => mount?.Type === 'bind');

  if (!codeMount?.Source) {
    return null;
  }

  const homePath = labels[`${PROJECT_LABEL_PREFIX}.home_path`] || CONTAINER_HOME_PATH;
  const homeMount = mounts.find((mount) => mount?.Destination === homePath);

  const projectName = labels[`${PROJECT_LABEL_PREFIX}.project_name`]
    || containerName.replace(/^codex-/, '')
    || path.basename(codeMount.Source)
    || 'workspace';

  return {
    id: labels[`${PROJECT_LABEL_PREFIX}.project_id`] || toProjectIdFromContainer(container?.Id ?? ''),
    name: projectName,
    path: codeMount.Source,
    containerName,
    codeMountPath,
    homePath,
    systemVolumeName: homeMount?.Type === 'volume' ? homeMount?.Name : undefined,
    systemHostPath: homeMount?.Type === 'bind' ? homeMount?.Source : undefined,
    lastActive: 'odzyskany po restarcie',
  };
};

const syncProjectsFromDocker = async () => {
  try {
    const { stdout } = await runCmd('docker', ['ps', '-a', '--filter', 'name=codex-', '--format', '{{.ID}}']);
    const containerIds = stdout
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const discovered = new Map();

    for (const containerId of containerIds) {
      try {
        const inspectResult = await runCmd('docker', ['inspect', containerId]);
        const [container] = JSON.parse(inspectResult.stdout);
        const project = inferProjectFromContainer(container);
        if (!project) continue;

        discovered.set(project.id, project);

        if (!statusByProject.has(project.id)) {
          statusByProject.set(project.id, { status: 'idle', progress: 0, currentStep: 'Kontener odzyskany po restarcie' });
        }
        if (!logsByProject.has(project.id)) {
          logsByProject.set(project.id, [{
            id: `recovered-${Date.now()}-${project.id}`,
            timestamp: now(),
            type: 'info',
            message: `✓ Wykryto istniejący kontener: ${project.containerName}`,
          }]);
        }
      } catch {
        // pomijamy pojedynczy kontener, jeśli inspect się nie powiedzie
      }
    }

    projects.clear();
    discovered.forEach((project, id) => projects.set(id, project));
  } catch {
    // brak dockera lub błąd runtime - zostawiamy aktualny stan mapy projektów
  }
};


const findLatestJarInProject = (projectPath) => {
  const ignoredDirs = new Set(['.git', 'node_modules', '.gradle']);
  const found = [];

  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.jar')) continue;
      if (entry.name.endsWith('-sources.jar') || entry.name.endsWith('-javadoc.jar')) continue;
      try {
        const stat = fs.statSync(full);
        found.push({ fullPath: full, mtimeMs: stat.mtimeMs, fileName: entry.name });
      } catch {
        // ignore file stat errors
      }
    }
  };

  walk(projectPath);
  found.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return found[0];
};

const resolveProject = (projectId, projectPath) => {
  if (projectId && projects.has(projectId)) {
    return projects.get(projectId);
  }

  if (projectPath) {
    return [...projects.values()].find((project) => project.path === projectPath);
  }

  return [...projects.values()][0];
};

const getBearerToken = (req) => {
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice('Bearer '.length).trim();
};

const isCliHeaderEnabled = (req) => String(req.headers['x-codex-cli-auth'] ?? '').toLowerCase() === 'true';

const detectCliSession = async () => {
  let codexInstalled = false;
  let codexVersion = '';
  try {
    const { stdout } = await runCmd('codex', ['--version']);
    codexInstalled = true;
    codexVersion = stdout.trim();
  } catch {
    codexInstalled = false;
  }

  const home = os.homedir();
  const possibleFiles = [
    path.join(home, '.codex', 'auth.json'),
    path.join(home, '.codex', 'credentials.json'),
    path.join(home, '.codex', 'config.toml'),
  ];

  const foundPath = possibleFiles.find((entry) => fs.existsSync(entry));

  return {
    codexInstalled,
    codexVersion: codexVersion || undefined,
    cliSessionDetected: Boolean(foundPath && codexInstalled),
    sessionPath: foundPath,
    loginHint: 'Uruchom `codex` i wybierz Sign in with ChatGPT.',
    loginRunning: cliLoginState.running,
    loginUrl: cliLoginState.loginUrl,
  };
};

const startCliLoginFlow = async () => {
  const status = await detectCliSession();
  if (!status.codexInstalled) {
    throw new Error('Nie znaleziono Codex CLI. Zainstaluj: npm i -g @openai/codex');
  }
  if (status.cliSessionDetected) {
    return {
      started: false,
      running: false,
      loginUrl: cliLoginState.loginUrl,
      message: 'Sesja Codex CLI już jest aktywna.',
    };
  }

  if (cliLoginState.running) {
    return {
      started: false,
      running: true,
      loginUrl: cliLoginState.loginUrl,
      message: 'Logowanie CLI już trwa.',
    };
  }

  const child = spawn('codex', ['login'], { stdio: ['ignore', 'pipe', 'pipe'] });
  cliLoginState.running = true;
  cliLoginState.startedAt = Date.now();

  const capture = (chunk) => {
    const text = chunk.toString();
    cliLoginState.lastOutput = `${cliLoginState.lastOutput}${text}`.slice(-2000);
    const match = text.match(/https?:\/\/\S+/);
    if (match?.[0]) {
      cliLoginState.loginUrl = match[0].replace(/[)\]\s]+$/, '');
    }
  };

  child.stdout.on('data', capture);
  child.stderr.on('data', capture);

  const finalize = () => {
    cliLoginState.running = false;
  };
  child.on('close', finalize);
  child.on('error', finalize);

  return {
    started: true,
    running: true,
    loginUrl: cliLoginState.loginUrl,
    message: 'Uruchomiono logowanie Codex CLI. Dokończ w przeglądarce.',
  };
};

const requireAuth = async (req, res, next) => {
  const token = getBearerToken(req);
  if (token.startsWith('sk-')) {
    req.authMode = 'api_key';
    req.openAiKey = token;
    next();
    return;
  }

  if (isCliHeaderEnabled(req)) {
    const cli = await detectCliSession();
    if (!cli.codexInstalled) {
      return res.status(401).send('Nie znaleziono Codex CLI. Zainstaluj: npm i -g @openai/codex');
    }
    if (!cli.cliSessionDetected) {
      return res.status(401).send('Codex CLI nie jest zalogowany. Uruchom `codex` i wybierz Sign in with ChatGPT.');
    }

    req.authMode = 'codex_cli';
    req.openAiKey = '';
    next();
    return;
  }

  return res.status(401).send('Wymagane logowanie: API key (sk-...) lub sesja Codex CLI.');
};

app.get('/api/health', (_, res) => {
  res.json({ ok: true, projects: projects.size });
});

app.get('/api/auth/cli', async (_, res) => {
  const status = await detectCliSession();
  if (!status.codexInstalled) {
    return res.status(400).json(status);
  }
  if (!status.cliSessionDetected) {
    return res.status(401).json(status);
  }
  return res.json(status);
});

app.post('/api/auth/cli/start', async (_, res) => {
  try {
    const result = await startCliLoginFlow();
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się uruchomić logowania CLI';
    return res.status(500).send(message);
  }
});

app.get('/api/auth/openai', requireAuth, async (req, res) => {
  if (req.authMode === 'codex_cli') {
    return res.json({ ok: true, mode: 'codex_cli' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${req.openAiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(401).send(text || 'Niepoprawny klucz OpenAI API');
    }

    return res.json({ ok: true, mode: 'api_key' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd połączenia z OpenAI';
    return res.status(500).send(message);
  }
});

app.get('/api/projects', requireAuth, async (_, res) => {
  await syncProjectsFromDocker();
  res.json([...projects.values()]);
});

app.post('/api/workspaces', requireAuth, async (req, res) => {
  const inputPath = String(req.body?.path ?? '').trim();
  const inputName = String(req.body?.name ?? '').trim();
  const image = String(req.body?.image ?? '').trim() || DEFAULT_IMAGE;
  const inputCodeMountPath = String(req.body?.codeMountPath ?? '').trim() || CONTAINER_CODE_PATH;
  const inputHomePath = String(req.body?.homePath ?? '').trim() || CONTAINER_HOME_PATH;
  const inputSystemHostPath = String(req.body?.systemHostPath ?? '').trim();

  if (!inputPath) {
    return res.status(400).send('Path jest wymagany');
  }

  if (!fs.existsSync(inputPath)) {
    return res.status(400).send(`Katalog nie istnieje: ${inputPath}`);
  }

  const resolvedHostPath = path.resolve(inputPath);
  const resolvedSystemHostPath = inputSystemHostPath ? path.resolve(inputSystemHostPath) : '';

  if (resolvedSystemHostPath && !fs.existsSync(resolvedSystemHostPath)) {
    return res.status(400).send(`Katalog systemowy nie istnieje: ${resolvedSystemHostPath}`);
  }
  const projectId = `p-${Date.now()}`;
  const projectName = inputName || path.basename(inputPath) || 'workspace';
  const containerName = `codex-${sanitizeName(projectName)}-${Date.now().toString().slice(-6)}`;
  const systemVolumeName = `codex-state-${sanitizeName(projectName)}-${Date.now().toString().slice(-6)}`;

  try {
    const runArgs = [
      'run',
      '-d',
      '--name',
      containerName,
      '--label',
      `${PROJECT_LABEL_PREFIX}.managed=true`,
      '--label',
      `${PROJECT_LABEL_PREFIX}.project_id=${projectId}`,
      '--label',
      `${PROJECT_LABEL_PREFIX}.project_name=${projectName}`,
      '--label',
      `${PROJECT_LABEL_PREFIX}.project_path=${resolvedHostPath}`,
      '--label',
      `${PROJECT_LABEL_PREFIX}.code_mount_path=${inputCodeMountPath}`,
      '--label',
      `${PROJECT_LABEL_PREFIX}.home_path=${inputHomePath}`,
      '--read-only',
      '--tmpfs',
      '/tmp',
      '--tmpfs',
      '/run',
      '--mount',
      `type=bind,src=${resolvedHostPath},dst=${inputCodeMountPath}`,
    ];

    let systemStorageLabel = '';

    if (resolvedSystemHostPath) {
      runArgs.push('--mount', `type=bind,src=${resolvedSystemHostPath},dst=${inputHomePath}`);
      systemStorageLabel = `bind ${resolvedSystemHostPath}`;
    } else {
      await runCmd('docker', ['volume', 'create', systemVolumeName]);
      runArgs.push('--mount', `type=volume,src=${systemVolumeName},dst=${inputHomePath}`);
      systemStorageLabel = `volume ${systemVolumeName}`;
    }

    runArgs.push('-e', `HOME=${inputHomePath}`, '-w', inputCodeMountPath, image, 'sh', '-lc', 'tail -f /dev/null');

    await runCmd('docker', runArgs);

    const project = {
      id: projectId,
      name: projectName,
      path: resolvedHostPath,
      containerName,
      codeMountPath: inputCodeMountPath,
      systemVolumeName: resolvedSystemHostPath ? undefined : systemVolumeName,
      systemHostPath: resolvedSystemHostPath || undefined,
      homePath: inputHomePath,
      lastActive: 'przed chwilą',
    };

    projects.set(projectId, project);
    statusByProject.set(projectId, { status: 'idle', progress: 0, currentStep: 'Kontener gotowy (kod odizolowany)' });
    logsByProject.set(projectId, [
      {
        id: `init-${Date.now()}`,
        timestamp: now(),
        type: 'info',
        message: `✓ Kontener ${containerName} uruchomiony (${image})`,
      },
      {
        id: `isolation-${Date.now()}`,
        timestamp: now(),
        type: 'info',
        message: `> Kod: ${resolvedHostPath} -> ${inputCodeMountPath} | System/home: ${systemStorageLabel} -> ${inputHomePath}`,
      },
    ]);

    return res.status(201).json(project);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się uruchomić kontenera';
    return res.status(500).send(message);
  }
});

app.get('/api/status', requireAuth, (req, res) => {
  const project = resolveProject(String(req.query.projectId ?? ''), undefined);
  if (!project) {
    return res.json({ status: 'idle', progress: 0, currentStep: 'Brak kontenera' });
  }
  return res.json(statusByProject.get(project.id) ?? { status: 'idle', progress: 0, currentStep: 'Gotowy' });
});

app.get('/api/logs', requireAuth, (req, res) => {
  const project = resolveProject(String(req.query.projectId ?? ''), undefined);
  if (!project) {
    return res.json([{ timestamp: now(), type: 'warning', message: 'Brak aktywnego kontenera.' }]);
  }
  return res.json(logsByProject.get(project.id) ?? []);
});

const executeInsideProject = async ({ project, command }) => {
  const startedAt = Date.now();
  statusByProject.set(project.id, { status: 'running', progress: 20, currentStep: `Uruchamianie: ${command}` });
  log(project.id, 'info', `▶ Start w kontenerze ${project.containerName}`);
  log(project.id, 'stdout', `> ${command}`);

  try {
    await runCmdStreaming({
      cmd: 'docker',
      args: ['exec', project.containerName, 'sh', '-lc', command],
      onStdoutLine: (line) => log(project.id, 'stdout', line),
      onStderrLine: (line) => log(project.id, 'warning', line),
      onHeartbeat: (elapsedSeconds) => {
        if (elapsedSeconds < 10) return;
        const progress = Math.min(95, 20 + Math.floor(elapsedSeconds / 6));
        statusByProject.set(project.id, {
          status: 'running',
          progress,
          currentStep: `W toku (${elapsedSeconds}s): ${command}`,
        });
      },
    });

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    statusByProject.set(project.id, { status: 'completed', progress: 100, currentStep: `Zakończono (${elapsedSeconds}s)` });
    log(project.id, 'info', `✓ Komenda zakończona w ${elapsedSeconds}s`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Błąd wykonania komendy';
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    statusByProject.set(project.id, { status: 'error', progress: 100, currentStep: `Błąd po ${elapsedSeconds}s: ${message}` });
    log(project.id, 'stderr', `✗ ${message}`);
    throw error;
  }
};


app.post('/api/upload-zip', requireAuth, async (req, res) => {
  const project = resolveProject(String(req.body?.projectId ?? ''), String(req.body?.projectPath ?? ''));
  const fileName = String(req.body?.fileName ?? '').trim();
  const zipBase64 = String(req.body?.zipBase64 ?? '').trim();

  if (!project) {
    return res.status(400).send('Najpierw wybierz aktywny projekt.');
  }
  if (!fileName.toLowerCase().endsWith('.zip')) {
    return res.status(400).send('Dozwolony jest tylko plik .zip');
  }
  if (!zipBase64) {
    return res.status(400).send('Brak danych ZIP');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-upload-'));
  const tempZip = path.join(tempDir, fileName.replace(/[^a-zA-Z0-9._-]+/g, '_'));

  try {
    const buffer = Buffer.from(zipBase64, 'base64');
    fs.writeFileSync(tempZip, buffer);

    await runCmd('unzip', ['-o', tempZip, '-d', project.path]);

    log(project.id, 'info', `✓ ZIP ${fileName} rozpakowany do ${project.path}`);
    return res.json({ ok: true, targetPath: project.path });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się rozpakować ZIP';
    log(project.id, 'stderr', `✗ Upload ZIP: ${message}`);
    return res.status(500).send(message);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});


app.get('/api/artifacts/jar/download', requireAuth, (req, res) => {
  const project = resolveProject(String(req.query.projectId ?? ''), undefined);
  if (!project) {
    return res.status(400).send('Najpierw wybierz aktywny projekt.');
  }

  const latestJar = findLatestJarInProject(project.path);
  if (!latestJar) {
    return res.status(404).send('Nie znaleziono pliku .jar. Najpierw uruchom build JAR.');
  }

  return res.download(latestJar.fullPath, latestJar.fileName);
});

app.post('/api/prompt', requireAuth, async (req, res) => {
  const prompt = String(req.body?.prompt ?? '').trim();
  const project = resolveProject(String(req.body?.projectId ?? ''), String(req.body?.projectPath ?? ''));

  if (!project) {
    return res.status(400).send('Najpierw utwórz kontener dla katalogu.');
  }
  if (!prompt) {
    return res.status(400).send('Prompt jest wymagany');
  }

  try {
    await executeInsideProject({ project, command: prompt });
    return res.json({ taskId: `${Date.now()}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Prompt failed';
    return res.status(500).send(message);
  }
});

app.post('/api/run', requireAuth, async (req, res) => {
  const inputCommand = String(req.body?.command ?? '').trim();
  const project = resolveProject(String(req.body?.projectId ?? ''), String(req.body?.projectPath ?? ''));
  if (!project) {
    return res.status(400).send('Najpierw utwórz kontener dla katalogu.');
  }

  const mappedCommands = {
    test: 'npm test || bun test || echo "Brak testów"',
    save: 'git add -A && git commit -m "chore: save from panel" || true',
    'create-pr': 'git status --short',
    'build-jar': 'set -e; if [ -f pom.xml ]; then echo "[build-jar] Maven project detected"; if [ -f ./mvnw ]; then chmod +x ./mvnw 2>/dev/null || true; ./mvnw -B --no-transfer-progress -DskipTests package; elif command -v mvn >/dev/null 2>&1; then mvn -B --no-transfer-progress -DskipTests package; else echo "Brak mvnw/mvn dla projektu Maven."; exit 1; fi; elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then echo "[build-jar] Gradle project detected"; if [ -f ./gradlew ]; then chmod +x ./gradlew 2>/dev/null || true; ./gradlew jar -x test --console=plain; elif command -v gradle >/dev/null 2>&1; then gradle jar -x test --console=plain; else echo "Brak gradlew/gradle dla projektu Gradle."; exit 1; fi; else echo "Brak konfiguracji Java (pom.xml / build.gradle)."; exit 1; fi',
  };

  const command = mappedCommands[inputCommand] ?? inputCommand;

  try {
    await executeInsideProject({ project, command });
    return res.json({ accepted: true, message: `Wysłano: ${command}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Run failed';
    return res.status(500).send(message);
  }
});

app.listen(PORT, () => {
  console.log(`Codex backend listening on http://localhost:${PORT}`);
});
