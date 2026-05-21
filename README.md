# RouletteLock - Deadlock Item Randomizer

A CLI tool for generating random item builds in Deadlock, written in TypeScript.

Currently the project is wholistically TypeScript, but i have the end goal of
moving the data-backend off TS, and into an sqlite database. The final step after
that is migrating the entire project into a react front-end so i can host the
project on a website, instead of instructing you guys to run the dev tools.

## Prerequisites

- git
- [Bun](https://bun.sh) (handles package management)

## Setup

### 1. Install Git

#### Windows (PowerShell)

```powershell
winget install Git.Git
```

#### macOS

```bash
brew install git
```

#### Linux

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install git
```

**Fedora/RHEL:**

```bash
sudo dnf install git
```

**Arch Linux:**

```bash
sudo pacman -S git
```

**NixOS:**

```bash
nix-env -iA nixpkgs.git
```

OR inside your sys-config

```nix
environemnt.systemPackages = with pkgs; [
  git
];
```

### 2. Install Bun

#### Windows (PowerShell)

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### macOS

```bash
brew install oven-sh/bun/bun
```

#### Linux

**Ubuntu/Debian, Fedora, Arch:**

```bash
curl -fsSL https://bun.sh/install | bash
```

**NixOS:**

```bash
nix-env -iA nixpkgs.bun
```

OR inside your sys-config

```nix
environemnt.systemPackages = with pkgs; [
  bun
];
```

#### macOS

```bash
brew install node
```

#### Linux

**Ubuntu/Debian:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
```

**Fedora/RHEL:**

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo dnf install nodejs
```

**Arch Linux:**

```bash
sudo pacman -S nodejs npm
```

**NixOS:**

```bash
nix-env -iA nixpkgs.nodejs_20
```

### 3. Clone and Install

```bash
git clone https://github.com/Khitboksy/RouletteLock.git
cd RouletteLock
bun install
```

## Running the App

```bash
bun run dev
```

## How to Use

1. **Select Active Mode**: Choose between "No Actives", "Only Actives", or "Mix"
2. **Enter Hero Count**: Minimum 3 heroes
3. **Category Selection**: Enter number of items per category (leave blank for random)
4. **Tier Selection**: Specify how many items per tier (leave blank for random)

The randomizer will generate heroes and items based on your selections, respecting:

- Category splits (Gun, Vitality, Spirit)
- Tier distribution (T1, T2, T3, T4)
- Active item constraints (max 4)
- Upgrade chain avoidance
