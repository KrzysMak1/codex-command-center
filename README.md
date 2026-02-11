# Codex Command Center

Docelowy flow:
1. odpalasz kontener Ubuntu,
2. klonujesz repo,
3. uruchamiasz **jeden skrypt**,
4. logujesz się do panelu (preferencyjnie przez **Codex CLI / konto ChatGPT**, alternatywnie API key),
5. tworzysz projekt i wskazujesz katalog kodu do edycji przez Codex.

## One-command start

```bash
./run-panel.sh
```

Skrypt automatycznie:
- sprawdza Docker/Node/npm,
- opcjonalnie wykrywa Codex CLI,
- instaluje zależności,
- robi kontrolny build,
- uruchamia backend + frontend (`npm run dev:full`).

Po starcie wejdź na: `http://localhost:5173`.

## Logowanie: Codex CLI (zalecane) lub API key

### A) Codex CLI (konto Codex / ChatGPT Plus/Pro)
1. W terminalu uruchom:
   ```bash
   codex
   ```
2. Wybierz **Sign in with ChatGPT** i zakończ logowanie.
3. W panelu wybierz tryb **Codex CLI** i kliknij logowanie — panel sam uruchomi proces CLI, otworzy stronę logowania i po wykryciu sesji automatycznie przeniesie Cię do dashboardu.

Backend sprawdza lokalną sesję CLI przez `/api/auth/cli` oraz uruchamia flow przez `/api/auth/cli/start`.

### B) API key
Podajesz klucz `sk-...` z `https://platform.openai.com/api-keys`.
Backend weryfikuje klucz przez `GET https://api.openai.com/v1/models` (`/api/auth/openai`).


## Izolacja kodu vs pliki systemowe kontenera

Przy tworzeniu workspace backend uruchamia kontener w trybie izolacji:
- kod projektu: bind mount hosta do `${CODEX_CONTAINER_CODE_PATH:-/workspace/project}`
- pliki systemowe/home narzędzi: osobny **named volume Docker** montowany do `${CODEX_CONTAINER_HOME_PATH:-/codex-home}`
- filesystem obrazu: `--read-only` + `tmpfs` dla `/tmp` i `/run`

Dzięki temu kod jest odseparowany od systemowych plików kontenera i stanu narzędzi.

## Tworzenie projektu (katalog -> kontener)

W sidebarze kliknij `+` i podaj:
- nazwę projektu (opcjonalnie),
- **Host: katalog kodu** (np. `/workspace/my-repo`),
- **Kontener: ścieżka kodu** (np. `/workspace/project`),
- **Kontener: ścieżka system/home** (np. `/codex-home`),
- **Host: katalog systemowy (opcjonalnie)** — jeśli podasz, system kontenera będzie mapowany bind mountem; jeśli puste, backend użyje named volume,
- image Dockera (domyślnie `ghcr.io/openai/codex-universal:latest`).

Backend tworzy kontener:

```bash
docker run -d --name <generated-name> \
  --read-only --tmpfs /tmp --tmpfs /run \
  --mount type=bind,src=<path>,dst=/workspace/project \
  --mount type=volume,src=<state-volume>,dst=/codex-home \
  -e HOME=/codex-home -w /workspace/project <image> sh -lc 'tail -f /dev/null'
```

Potem prompty i akcje panelu wykonują się przez `docker exec` w tym kontenerze.

Dodatkowo w panelu masz przycisk **Wyślij kod ZIP** — wskazujesz archiwum `.zip`, a backend rozpakowuje je do katalogu projektu na hoście.

## API

- `GET /api/health`
- `GET /api/auth/cli`
- `GET /api/auth/openai`
- `POST /api/workspaces`
- `GET /api/projects`
- `GET /api/status?projectId=...`
- `GET /api/logs?projectId=...`
- `POST /api/prompt`
- `POST /api/run`
- `POST /api/upload-zip`
