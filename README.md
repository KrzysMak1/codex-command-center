# Codex CLI – Panel Zarządzania

Panel webowy do zarządzania środowiskiem **Codex CLI** uruchomionym w Dockerze.  
Zbudowany w React + TypeScript + TailwindCSS z ciemną, terminalową estetyką.

---

## ✨ Funkcjonalności

- **Autoryzacja** – logowanie tokenem API
- **Sidebar projektów** – przełączanie między repozytoriami/workspace'ami
- **Prompt input** – wysyłanie komend do Codex CLI (`/popraw`, `/refactor`, `/stwórz testy`)
- **Historia promptów** – lista poprzednich zadań z ich statusami
- **Logi terminala** – kolorowany podgląd stdout/stderr/warning z auto-scroll
- **Status zadania** – pasek postępu z aktualnym krokiem (analiza → generowanie → testy → gotowe)
- **Przyciski akcji** – Uruchom testy, Zapisz zmiany, Stwórz PR (z modalem potwierdzenia)
- **Responsywny design** – działa na desktop i mobile

## 🛠 Stack technologiczny

| Warstwa    | Technologie                                    |
| ---------- | ---------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite                     |
| Stylizacja | TailwindCSS, shadcn/ui                         |
| State      | Zustand                                        |
| Routing    | React Router v6                                |
| Ikony      | Lucide React                                   |

## 🚀 Uruchomienie lokalne

```bash
# 1. Sklonuj repozytorium
git clone <URL_REPOZYTORIUM>
cd <NAZWA_PROJEKTU>

# 2. Zainstaluj zależności
npm install

# 3. Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod `http://localhost:5173`.

## 📁 Struktura projektu

```
src/
├── components/
│   ├── ActionButtons.tsx      # Przyciski akcji + modal potwierdzenia
│   ├── LogsViewer.tsx         # Podgląd logów terminala
│   ├── NavLink.tsx            # Link nawigacyjny
│   ├── ProjectSidebar.tsx     # Sidebar z listą projektów
│   ├── PromptHistory.tsx      # Historia wysłanych promptów
│   ├── PromptInput.tsx        # Pole do wpisywania promptów
│   ├── TaskStatusPanel.tsx    # Panel statusu zadania
│   └── ui/                    # Komponenty shadcn/ui
├── pages/
│   ├── Index.tsx              # Strona główna (router auth)
│   ├── LoginPage.tsx          # Ekran logowania
│   ├── Dashboard.tsx          # Główny dashboard
│   └── NotFound.tsx           # Strona 404
├── store/
│   └── useAppStore.ts         # Globalny store Zustand
├── index.css                  # Zmienne CSS + design tokens
└── App.tsx                    # Routing aplikacji
```

## 🔌 Integracja z backendem (planowana)

Panel jest przygotowany do komunikacji z API backendowym obsługującym Codex CLI w Dockerze:

| Endpoint     | Metoda | Opis                                      |
| ------------ | ------ | ----------------------------------------- |
| `/prompt`    | POST   | Wysyła prompt do Codex CLI                |
| `/status`    | GET    | Zwraca status aktualnego zadania          |
| `/logs`      | GET    | Pobiera logi z kontenera                  |
| `/run`       | POST   | Uruchamia komendę w kontenerze            |

Obecnie panel działa na danych mock (symulacja).

## 🎨 Kolorowanie logów

| Typ       | Kolor   |
| --------- | ------- |
| `stdout`  | 🟢 Zielony |
| `stderr`  | 🔴 Czerwony |
| `warning` | 🟡 Żółty   |
| `info`    | 🔵 Niebieski |

## 📄 Licencja

MIT
