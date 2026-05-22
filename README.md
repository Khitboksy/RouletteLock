# RouletteLock — Deadlock Item Randomizer

A Deadlock item randomizer with a React frontend, SQLite-backed data, and
admin tooling for editing items, heroes, and upgrade chains.

**Live site**: <https://khitboksy.github.io/RouletteLock>

## Prerequisites

- [Git](https://git-scm.com)
- [Bun](https://bun.sh)

## Setup

### Install Git (if you dont already have it)

Windows (PowerShell)

```powershell
winget install Git.Git
```

macOS

```bash
brew install git
```

Linux

— Ubuntu/Debian

```bash
sudo apt update && sudo apt install git
```

Fedora/RHEL

```bash
sudo dnf install git
```

Arch

```bash
sudo pacman -S git
```

NixOS

```nix
nix-env -iA nixpkgs.git
```

 Or add to your system configuration:

```nix
environment.systemPackages = with pkgs; [
  git
];
```

### Install Bun

Windows (PowerShell)

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

macOS

```bash
brew install oven-sh/bun/bun
```

Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

NixOS

```nix
nix-env -iA nixpkgs.bun
```

Or add to your system configuration:

```nix
environment.systemPackages = with pkgs; [
  bun
];
```

### Clone and Install

```bash
git clone https://github.com/Khitboksy/RouletteLock.git
cd RouletteLock
# Install deps for the dev environment
bun install
cd frontend && bun install && cd ..
# Populate the database (`bun run deploy` also seeds on first run)
bun run seed
```

## Development

```bash
bun run admin
```

Opens <http://localhost:5173> with HMR, API server, and the **Admin** tab.

| Command                  | What it does                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `bun run admin`          | Full dev env — exports data, starts API (port 3000) + Vite HMR (port 5173). Admin tab available. |
| `bun run frontend:dev`   | Vite HMR only (no backend, no admin tab).                                                        |
| `bun run dev`            | Original terminal-based CLI randomizer.                                                          |
| `bun run serve`          | API server only, serves production frontend build.                                               |
| `bun run seed`           | Populates SQLite database from source data.                                                      |
| `bun run export-data`    | Exports SQLite → JSON for the static frontend.                                                   |
| `bun run frontend:build` | Builds frontend for production (`tsc -b && vite build`).                                         |
| `bun run deploy`         | Full pipeline: seed if blank db → export → build → commit to gh-pages (does NOT push).           |

## Project Structure

```
├── frontend/          # React SPA (Vite + TypeScript)
│   ├── src/           # App, randomizer, styles, API client
│   └── public/data/   # Static JSON exports (items.json, heroes.json)
├── src/
│   ├── db/            # SQLite adapter, seed, schema, export
│   ├── server.ts      # API server (Bun.serve)
│   ├── admin.ts       # Dev orchestrator
│   ├── deploy.ts      # gh-pages deploy pipeline
│   ├── main.ts        # CLI randomizer
│   ├── logic.ts       # randomizer engine
│   ├── dataItems.ts   # items source. reset with `bun run seed`
│   └── dataHeroes.ts  # heros source. reset with `bun run seed`
└── package.json
```

## Data Flow

Source data → `bun run seed` → SQLite → `bun run export-data` →
`frontend/public/data/*.json` → React frontend loads on startup.

In dev mode (`bun run admin`), the frontend also talks to the API at `/api/*`
for admin CRUD and git operations. Admin changes are preserved on deploy if and
only if the database doesnt get deleted. If you lose the database, you reseed
whatever is *inside* the TypeScript arrays in `src/dataHeroes.ts` and `src/dataItems.ts`

Randomization runs entirely in the browser (`frontend/src/randomizer.ts`).
The server-side engine (`src/logic.ts`) is only used by the CLI.
