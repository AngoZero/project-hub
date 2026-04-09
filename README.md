# Project Hub

Local desktop hub for organizing development projects on macOS and Windows.

## Stack

- Tauri 2
- React 19
- TypeScript
- Vite
- Rust backend for local persistence, scanning, and system actions

## MVP features

- Project catalog with list/grid layout
- Root folder registry and recursive scan
- Stack detection for Node, React, Vite, Laravel, Rust, Flutter, Docker, and .NET markers
- Local JSON persistence ready to migrate later
- Project detail with notes, URLs, Git branch, detected files, and quick commands
- Quick actions for Finder/Explorer, VS Code, terminal, Claude, Codex, and local URLs
- macOS terminal preference order for plain terminal launch:
  - Warp
  - iTerm
  - Terminal.app
- Windows terminal preference order for plain terminal launch:
  - Windows Terminal
  - PowerShell

## Development

Install dependencies:

```bash
npm install
```

Run the desktop app in development on macOS:

```bash
source "$HOME/.cargo/env"
npm run tauri:dev
```

Run the desktop app in development on Windows:

```powershell
npm run tauri:dev
```

Build the frontend only:

```bash
npm run build
```

Create a debug `.app` bundle on macOS:

```bash
source "$HOME/.cargo/env"
npx tauri build --debug --bundles app
```

Create a Windows installer bundle:

```powershell
npx tauri build --debug --bundles msi
```

## Validation

- `npm run lint`
- `npm run build`
- `source "$HOME/.cargo/env" && cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- Persistence lives in the local app data directory under `project-hub/state.json`.
- On first launch, the app tries to seed common roots if they exist.
- macOS defaults:
  - `~/Documents/dev`
  - `~/Documents/_dev`
  - `~/Projects`
  - `~/Desktop/clientes`
- Windows defaults:
  - `~/Documents/dev`
  - `~/Documents/_dev`
  - `~/Projects`
  - `~/source/repos`
- Windows may require WebView2 depending on the target environment.
- `.dmg` and `.msi` packaging are not required for local development.
